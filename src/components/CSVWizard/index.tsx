import { useEffect, useMemo, useRef, useState } from 'react'
import { db, type ImportBatch } from '../../data/db'
import { guessMapping, type ColumnMapping } from '../../data/import/mapping'
import { normalizeRows } from '../../data/import/normalize'
import { browserTimeZone } from '../../utils/dates'
import { sha256 } from '../../utils/hash'
import { loadSampleData } from '../../data/sample'
import { downloadTemplateCsv } from '../../utils/templateCsv'

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
  const [file, setFile] = useState<File | null>(null)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [preview, setPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING)
  const [progress, setProgress] = useState(0)
  const [rowCount, setRowCount] = useState(0)
  const [delimiter, setDelimiter] = useState(',')
  const [parseMs, setParseMs] = useState(0)
  const [normalizeMs, setNormalizeMs] = useState(0)
  const [dbWriteMs, setDbWriteMs] = useState(0)
  const [dateFailures, setDateFailures] = useState(0)
  const [amountFailures, setAmountFailures] = useState(0)
  const [signConvention, setSignConvention] = useState<'negative-outflow' | 'positive-outflow'>(
    'negative-outflow',
  )
  const [timeUnknownPct, setTimeUnknownPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!file) return
    const workerInstance = new Worker(
      new URL('../../data/import/parse.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerInstance.onmessage = (event: MessageEvent<WorkerResult>) => {
      const payload = event.data
      if (payload.type === 'progress') {
        setProgress(payload.percent)
        setRowCount(payload.rowCount)
      }
      if (payload.type === 'complete') {
        setHeaders(payload.headers)
        setRows(payload.rows)
        setPreview(payload.preview)
        setDelimiter(payload.delimiter)
        setRowCount(payload.rowCount)
        setParseMs(payload.parseMs)
        setMapping(guessMapping(payload.headers))
      }
      if (payload.type === 'error') {
        setError('This does not look like a CSV.')
      }
    }
    workerInstance.postMessage({ file })
    setWorker(workerInstance)

    return () => workerInstance.terminate()
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
    if (error) return 'This does not look like a CSV'
    if (!rows.length) return ''
    if (!mapping.date || !mapping.amount) return 'Missing Date or Amount column'
    return 'File looks valid'
  }, [error, rows.length, mapping.date, mapping.amount])

  const statusTone = useMemo(() => {
    if (!mappingStatus) return ''
    if (mappingStatus === 'File looks valid') return 'status-ok'
    return 'status-warn'
  }, [mappingStatus])

  const handleImport = async () => {
    if (!canImport || !file) return
    setImporting(true)
    setError(null)
    try {
      const importBatchId = await sha256(`${file.name}-${Date.now()}`)
      const normalizeStart = performance.now()
      const normalizeResult = await normalizeRows(headers, rows, mapping, {
        timezone: browserTimeZone,
        negativesAreOutflow: signConvention === 'negative-outflow',
        importBatchId,
        defaultCategory: 'Uncategorized',
      })
      const normalizeEnd = performance.now()
      setNormalizeMs(Math.round(normalizeEnd - normalizeStart))
      setDateFailures(normalizeResult.dateFailures)
      setAmountFailures(normalizeResult.amountFailures)

      const timeUnknownPctCalc = normalizeResult.transactions.length
        ? normalizeResult.timeUnknownCount / normalizeResult.transactions.length
        : 0
      setTimeUnknownPct(timeUnknownPctCalc)

      const dbStart = performance.now()
      for (let i = 0; i < normalizeResult.transactions.length; i += BATCH_SIZE) {
        const chunk = normalizeResult.transactions.slice(i, i + BATCH_SIZE)
        await db.transactions.bulkPut(chunk)
      }
      const dbEnd = performance.now()
      setDbWriteMs(Math.round(dbEnd - dbStart))

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
      }
      await db.imports.add(importBatch)
      onImported?.()
      setStatus('Imported on this device.')
    } catch (err) {
      setError('Import failed. Please retry or check your mappings.')
    } finally {
      setImporting(false)
      worker?.terminate()
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Import history (CSV)</h2>
          <p className="section-subtitle">Optional history import.</p>
        </div>
      </div>

      <div className="inline-list" style={{ marginBottom: 12 }}>
        <button
          className="button button-primary"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Import CSV
        </button>
        <button className="button button-ghost" type="button" onClick={() => setShowHelp(true)}>
          Help me find the right file
        </button>
        <button
          className="button"
          type="button"
          onClick={async () => {
            setStatus('Loading sample data...')
            await loadSampleData()
            setStatus('Sample data loaded (not your real data).')
            onImported?.()
          }}
        >
          Try with sample data
        </button>
        <button className="button button-muted" type="button" onClick={downloadTemplateCsv}>
          Download template CSV
        </button>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        className="input"
        ref={fileInputRef}
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />

      {progress > 0 && progress < 100 ? <p className="helper">Parsing... {progress}%</p> : null}
      {error ? <p className="helper">{error}</p> : null}
      {status ? <p className="helper">{status}</p> : null}

      {headers.length > 0 ? (
        <div style={{ marginTop: 20 }} className="grid grid-2">
          {(
            [
              ['date', 'Date/Datetime *'],
              ['amount', 'Amount *'],
              ['merchant', 'Merchant'],
              ['description', 'Description'],
              ['category', 'Category'],
              ['currency', 'Currency'],
            ] as Array<[keyof ColumnMapping, string]>
          ).map(([key, label]) => (
            <div key={key}>
              <label className="helper">{label}</label>
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
            </div>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <div style={{ marginTop: 20 }}>
          <div className="inline-list">
            <div className="tag">Delimiter: {delimiter}</div>
            <div className="tag">Rows: {rowCount}</div>
            <div className="tag">Sign: {signConvention}</div>
            {mappingStatus ? (
              <div className={statusTone}>
                {mappingStatus === 'File looks valid' ? 'File looks valid ✅' : 'Needs mapping ⚠️'}
              </div>
            ) : null}
          </div>
          {mappingStatus && mappingStatus !== 'File looks valid' ? (
            <p className="helper" style={{ marginTop: 8 }}>
              {mappingStatus}
            </p>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <label className="helper">Sign convention</label>
            <div className="inline-list">
              <button
                className={signConvention === 'negative-outflow' ? 'button button-primary' : 'button'}
                onClick={() => setSignConvention('negative-outflow')}
              >
                Negative = Outflow
              </button>
              <button
                className={signConvention === 'positive-outflow' ? 'button button-primary' : 'button'}
                onClick={() => setSignConvention('positive-outflow')}
              >
                Positive = Outflow
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview.length ? (
        <div style={{ marginTop: 20 }}>
          <div className="helper">
            Preview: {file?.name || 'Selected file'} · {rowCount} rows · {delimiter} delimiter
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

      <div style={{ marginTop: 20 }} className="inline-list">
        <button className="button button-primary" disabled={!canImport} onClick={handleImport}>
          {importing ? 'Importing...' : 'Import now'}
        </button>
      </div>

      {showHelp ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3 className="insight-title">Find your transactions CSV</h3>
              <button className="button button-ghost" onClick={() => setShowHelp(false)}>
                Close
              </button>
            </div>
          <div className="modal-content">
            <div className="modal-block">
              <div className="helper">Where to look</div>
              <div className="inline-list">
                <span className="pill">Bank/Card Website</span>
                <span className="pill">Mobile Banking App</span>
                <span className="pill">Budgeting App Export</span>
              </div>
            </div>
            <div className="modal-block">
              <div className="helper">Steps</div>
              <p className="helper">Transactions → Export/Download → CSV/Excel</p>
            </div>
            <div className="modal-block">
              <div className="helper">Recommended range</div>
              <p className="helper">Last 60–90 days.</p>
            </div>
            <div className="modal-block">
              <div className="helper">If PDF only</div>
              <p className="helper">PDFs aren’t supported. Export transactions.</p>
            </div>
            <div className="modal-block">
              <div className="helper">Excel → CSV</div>
              <p className="helper">File → Save As / Download → CSV.</p>
            </div>
            <div className="modal-block">
              <div className="helper">Privacy</div>
              <p className="helper">Stays on this device.</p>
            </div>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  )
}
