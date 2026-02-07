import { useEffect, useState } from 'react'
import { db, type ImportBatch } from '../../data/db'
import CSVWizard from '../../components/CSVWizard'

export default function Data() {
  const [imports, setImports] = useState<ImportBatch[]>([])
  const [status, setStatus] = useState('')
  const [taggedCount, setTaggedCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [batches, tagged] = await Promise.all([
        db.imports.orderBy('created_at').reverse().toArray(),
        db.tx_mood_annotations.count(),
      ])
      setImports(batches)
      setTaggedCount(tagged)
    }
    load()
  }, [])

  const deleteBatch = async (batch: ImportBatch) => {
    if (!confirm(`Delete import batch ${batch.filename}? This cannot be undone.`)) return
    await db.transactions.where('import_batch_id').equals(batch.id).delete()
    await db.imports.delete(batch.id)
    const batches = await db.imports.orderBy('created_at').reverse().toArray()
    setImports(batches)
    setStatus(`Deleted batch ${batch.filename}.`)
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Data</h1>
          <p className="section-subtitle">Import transactions (optional).</p>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="inline-list">
          <div className="helper">Mood‑tagged purchases: {taggedCount}</div>
          <div className="helper">Tag 5 to unlock stronger insights.</div>
          <a className="button button-muted" href="/timeline">
            Tag purchases
          </a>
        </div>
      </div>
      <CSVWizard />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h2 className="section-title">Import history</h2>
          </div>
        </div>
        {status ? <span className="helper">{status}</span> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Import</th>
              <th>Rows</th>
              <th>Size</th>
              <th>Delimiter</th>
              <th>Sign</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.filename}</td>
                <td>{batch.row_count}</td>
                <td>{batch.file_size_mb} MB</td>
                <td>{batch.delimiter}</td>
                <td>{batch.sign_convention}</td>
                <td>
                  <button className="button" onClick={() => deleteBatch(batch)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
