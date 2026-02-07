import { useEffect, useMemo, useState } from 'react'
import { db, type ImportBatch } from '../../data/db'
import { guessMapping, type ColumnMapping } from '../../data/import/mapping'
import { normalizeRows } from '../../data/import/normalize'
import { browserTimeZone } from '../../utils/dates'
import { sha256 } from '../../utils/hash'

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
        setError('CSV parse failed. Please check the file format.')
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
    } catch (err) {
      setError('Import failed. Please retry or check your mappings.')
    } finally {
      setImporting(false)
      worker?.terminate()
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">CSV Mapping Wizard</h2>
          <p className="section-subtitle">Upload a CSV and map fields to the canonical schema.</p>
        </div>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        className="input"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />

      {progress > 0 && progress < 100 ? (
        <p className="helper">Parsing... {progress}%</p>
      ) : null}
      {error ? <p className="helper">{error}</p> : null}

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
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="helper">Toggle sign convention</label>
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
          <div className="helper">Preview (first 20 rows)</div>
          <table className="table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
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
          {importing ? 'Importing...' : 'Normalize + Import'}
        </button>
        {dateFailures || amountFailures ? (
          <span className="helper">
            Date failures: {dateFailures} · Amount failures: {amountFailures}
          </span>
        ) : null}
        {normalizeMs || dbWriteMs ? (
          <span className="helper">
            Normalize: {normalizeMs}ms · DB write: {dbWriteMs}ms · Time unknown: {(
              timeUnknownPct * 100
            ).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  )
}
