import { useEffect, useState } from 'react'
import { db, type ImportBatch } from '../../data/db'

export default function Debug() {
  const [latest, setLatest] = useState<ImportBatch | null>(null)

  useEffect(() => {
    const load = async () => {
      const batch = await db.imports.orderBy('created_at').reverse().first()
      setLatest(batch || null)
    }
    load()
  }, [])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Debug</h1>
          <p className="section-subtitle">Instrumentation for the last import.</p>
        </div>
      </div>
      <div className="card">
        {latest ? (
          <ul>
            <li>parse_ms: {latest.parse_ms}</li>
            <li>normalize_ms: {latest.normalize_ms}</li>
            <li>db_write_ms: {latest.db_write_ms}</li>
            <li>compute_ms: {latest.compute_ms}</li>
            <li>row_count: {latest.row_count}</li>
            <li>file_size_mb: {latest.file_size_mb}</li>
            <li>time_unknown_pct: {latest.time_unknown_pct}</li>
          </ul>
        ) : (
          <p className="helper">No import metrics yet.</p>
        )}
      </div>
    </div>
  )
}
