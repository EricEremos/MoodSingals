import { useEffect, useMemo, useRef, useState } from 'react'
import { db, type ImportBatch } from '../../data/db'
import { guessMapping, type ColumnMapping } from '../../data/import/mapping'
import { normalizeRows } from '../../data/import/normalize'
import { browserTimeZone } from '../../utils/dates'
import { sha256 } from '../../utils/hash'
import { loadSampleData } from '../../data/sample'
import { downloadTemplateCsv } from '../../utils/templateCsv'
import InfoSheet from '../InfoSheet'
import { copy } from '../../utils/copy'

type WorkerResult =
  | {
      type: 'progress'
      percent: number
      rowCount: number
    }
  | {
      type: 'complete'
      headers: string[]
      rows: string[][]
      preview: string[][]
      delimiter: string
      rowCount: number
      parseMs: number
      headerDetected: boolean
    }
  | {
      type: 'error'
      errors: unknown
    }

const DEFAULT_MAPPING: ColumnMapping = {
  date: null,
  amount: null,
  merchant: null,
  description: null,
  category: null,
  currency: null,
}

const BATCH_SIZE = 750

export default function CSVWizard({ onImported }: { onImported?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [preview, setPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING)
  const [progress, setProgress] = useState(0)
  const [rowCount, setRowCount] = useState(0)
  const [delimiter, setDelimiter] = useState(',')
  const [parseMs, setParseMs] = useState(0)
  const [signConvention, setSignConvention] = useState<'negative-outflow' | 'positive-outflow'>(
    'negative-outflow',
  )
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!file) return

    const workerInstance = new Worker(new URL('../../data/import/parse.worker.ts', import.meta.url), {
      type: 'module',
    })

    workerRef.current?.terminate()
    workerRef.current = workerInstance

    workerInstance.onmessage = (event: MessageEvent<WorkerResult>) => {
      const payload = event.data
      if (payload.type === 'progress') {
        setProgress(payload.percent)
        setRowCount(payload.rowCount)
        return
      }
      if (payload.type === 'complete') {
        setHeaders(payload.headers)
        setRows(payload.rows)
        setPreview(payload.preview)
        setDelimiter(payload.delimiter)
        setRowCount(payload.rowCount)
        setParseMs(payload.parseMs)
        setError(null)
        setMapping(guessMapping(payload.headers))
        return
      }
      setError(copy.data.importStatusError)
    }

    workerInstance.postMessage({ file })

    return () => {
      workerInstance.terminate()
      if (workerRef.current === workerInstance) {
        workerRef.current = null
      }
    }
  }, [file])

  useEffect(() => {
    if (!rows.length) return
    const negatives = rows
      .map((row) => {
        const idx = headers.indexOf(mapping.amount || '')
        if (idx < 0) return 0
        return Number.parseFloat(String(row[idx] || '0'))
      })
      .filter((value) => !Number.isNaN(value))

    const negativeShare = negatives.filter((value) => value < 0).length / Math.max(negatives.length, 1)
    setSignConvention(negativeShare > 0.7 ? 'negative-outflow' : 'positive-outflow')
  }, [rows, headers, mapping.amount])

  const canImport = useMemo(() => {
    return Boolean(mapping.date && mapping.amount && !importing && rows.length)
  }, [mapping, importing, rows.length])

  const mappingStatus = useMemo(() => {
    if (error) return copy.data.importStatusError
    if (!rows.length) return ''
    if (!mapping.date || !mapping.amount) return copy.data.importStatusMissing
    return copy.data.importStatusReady
  }, [error, rows.length, mapping.date, mapping.amount])

  const statusTone = useMemo(() => {
    if (!mappingStatus) return ''
    if (mappingStatus === copy.data.importStatusReady) return 'status-ok'
    return 'status-warn'
  }, [mappingStatus])

  const handleImport = async () => {
    if (!canImport || !file) return
    setImporting(true)
    setError(null)

    try {
      const importBatchId = await sha256(`${file.name}-${Date.now()}`)
      const fileFingerprint = await sha256(`${file.name}-${file.size}-${file.lastModified}`)
      const normalizeStart = performance.now()

      const normalizeResult = await normalizeRows(headers, rows, mapping, {
        timezone: browserTimeZone,
        negativesAreOutflow: signConvention === 'negative-outflow',
        importBatchId,
        defaultCategory: 'Uncategorized',
      })

      const normalizeEnd = performance.now()

      const timeUnknownPctCalc = normalizeResult.transactions.length
        ? normalizeResult.timeUnknownCount / normalizeResult.transactions.length
        : 0

      const dbStart = performance.now()
      for (let i = 0; i < normalizeResult.transactions.length; i += BATCH_SIZE) {
        const chunk = normalizeResult.transactions.slice(i, i + BATCH_SIZE)
        const hashes = chunk.map((tx) => tx.raw_hash).filter(Boolean) as string[]
        let filtered = chunk
        if (hashes.length) {
          const existing = await db.transactions.where('raw_hash').anyOf(hashes).toArray()
          const existingSet = new Set(existing.map((tx) => tx.raw_hash))
          filtered = chunk.filter((tx) => !tx.raw_hash || !existingSet.has(tx.raw_hash))
        }
        if (filtered.length) {
          await db.transactions.bulkPut(filtered)
        }
      }
      const dbEnd = performance.now()

      const importBatch: ImportBatch = {
        id: importBatchId,
        filename: file.name,
        created_at: new Date().toISOString(),
        row_count: normalizeResult.transactions.length,
        file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
        delimiter,
        sign_convention: signConvention,
        parse_ms: parseMs,
        normalize_ms: Math.round(normalizeEnd - normalizeStart),
        db_write_ms: Math.round(dbEnd - dbStart),
        compute_ms: 0,
        time_unknown_pct: Number((timeUnknownPctCalc * 100).toFixed(2)),
        mapping,
        source_name: 'csv',
        mapping_json: JSON.stringify(mapping),
        file_fingerprint: fileFingerprint,
      }

      await db.imports.add(importBatch)
      setStatus(copy.data.importDone)
      onImported?.()
    } catch {
      setError('Import failed. Check mapping and retry.')
    } finally {
      setImporting(false)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">Import transactions</h3>
        </div>
        <InfoSheet title={copy.data.importInfoTitle}>
          <ul className="sheet-list">
            {copy.data.importInfoBody.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </InfoSheet>
      </div>

      <div className="inline-list" style={{ marginBottom: 12 }}>
        <button className="button button-primary" type="button" onClick={() => fileInputRef.current?.click()}>
          Import transactions
        </button>
        <button
          className="button"
          type="button"
          onClick={async () => {
            setStatus('Loading demo...')
            await loadSampleData()
            setStatus('Demo data loaded.')
            onImported?.()
          }}
        >
          {copy.data.loadDemo}
        </button>
        <button className="button button-muted" type="button" onClick={downloadTemplateCsv}>
          {copy.data.csvTemplate}
        </button>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        className="input"
        ref={fileInputRef}
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />

      {progress > 0 && progress < 100 ? <p className="body-subtle">Parsing {progress}%</p> : null}
      {error ? <p className="body-subtle">{error}</p> : null}
      {status ? <p className="body-subtle">{status}</p> : null}

      {headers.length ? (
        <div style={{ marginTop: 16 }} className="grid grid-2">
          {(
            [
              ['date', 'Date *'],
              ['amount', 'Amount *'],
              ['merchant', 'Merchant'],
              ['description', 'Description'],
              ['category', 'Category'],
              ['currency', 'Currency'],
            ] as Array<[keyof ColumnMapping, string]>
          ).map(([key, label]) => (
            <label key={key} className="field-block">
              <span className="section-label">{label}</span>
              <select
                className="select"
                value={mapping[key] || ''}
                onChange={(event) =>
                  setMapping((prev) => ({
                    ...prev,
                    [key]: event.target.value || null,
                  }))
                }
              >
                <option value="">Not mapped</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <div style={{ marginTop: 16 }}>
          <div className="inline-list">
            <div className="tag">Rows {rowCount}</div>
            <div className="tag">Delimiter {delimiter}</div>
            <div className="tag">Sign {signConvention}</div>
            {mappingStatus ? <div className={statusTone}>{mappingStatus}</div> : null}
          </div>

          <div style={{ marginTop: 12 }}>
            <span className="section-label">Sign convention</span>
            <div className="inline-list" style={{ marginTop: 8 }}>
              <button
                className={signConvention === 'negative-outflow' ? 'button button-primary' : 'button'}
                type="button"
                onClick={() => setSignConvention('negative-outflow')}
              >
                Negative = Outflow
              </button>
              <button
                className={signConvention === 'positive-outflow' ? 'button button-primary' : 'button'}
                type="button"
                onClick={() => setSignConvention('positive-outflow')}
              >
                Positive = Outflow
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview.length ? (
        <div style={{ marginTop: 16 }}>
          <div className="body-subtle">
            Preview · {file?.name || 'Selected file'} · {rowCount} rows
          </div>
          <table className="table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 5).map((row, idx) => (
                <tr key={`${row[0]}-${idx}`}>
                  {row.map((value, colIdx) => (
                    <td key={`${colIdx}-${value}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }} className="inline-list">
        <button className="button button-primary" type="button" disabled={!canImport} onClick={handleImport}>
          {importing ? 'Importing...' : 'Import now'}
        </button>
      </div>
    </div>
  )
}
