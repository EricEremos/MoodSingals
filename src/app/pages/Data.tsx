import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { db, type ImportBatch } from '../../data/db'
import CSVWizard from '../../components/CSVWizard'
import { copy } from '../../utils/copy'
import { exportJsonSnapshot, importJsonSnapshot } from '../../data/transfer/json'
import { exportCsvSnapshots } from '../../data/transfer/csv'
import { loadSampleData, resetSampleData } from '../../data/sample'
import { Button, Card, CardHeader, EmptyState } from '../../components/ui'

export default function Data() {
  const [imports, setImports] = useState<ImportBatch[]>([])
  const [status, setStatus] = useState('')
  const [demoLoaded, setDemoLoaded] = useState(localStorage.getItem('ms_demo') === 'true')
  const jsonInputRef = useRef<HTMLInputElement | null>(null)

  const refresh = async () => {
    const batches = await db.imports.orderBy('created_at').reverse().toArray()
    setImports(batches)
  }

  useEffect(() => {
    refresh()
  }, [])

  const deleteBatch = async (batch: ImportBatch) => {
    if (!confirm(`Delete ${batch.filename}?`)) return
    await db.transactions.where('import_batch_id').equals(batch.id).delete()
    await db.imports.delete(batch.id)
    await refresh()
    setStatus(`Deleted ${batch.filename}.`)
  }

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await importJsonSnapshot(file, { replace: false })
      await refresh()
      setStatus(copy.data.transferImported)
    } catch {
      setStatus(copy.data.transferFailed)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.data.title}</h2>
        </div>
      </div>

      <CSVWizard onImported={refresh} />

      <Card style={{ marginTop: 16 }}>
        <CardHeader>
          <h3 className="card-title">{copy.data.moveTitle}</h3>
        </CardHeader>
        <div className="inline-list" style={{ marginTop: 12 }}>
          <Button
            variant="primary"
            type="button"
            onClick={async () => {
              await exportJsonSnapshot()
              setStatus(copy.data.transferDone)
            }}
          >
            Export JSON
          </Button>
          <Button variant="ghost" type="button" onClick={() => jsonInputRef.current?.click()}>
            Import JSON
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={async () => {
              await exportCsvSnapshots()
              setStatus('CSV exported.')
            }}
          >
            {copy.data.csvExport}
          </Button>
        </div>
        <input
          ref={jsonInputRef}
          type="file"
          accept="application/json"
          className="input"
          style={{ display: 'none' }}
          onChange={handleImportJson}
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader>
          <h3 className="card-title">Demo data</h3>
        </CardHeader>
        <div className="inline-list">
          <Button
            variant="ghost"
            type="button"
            onClick={async () => {
              await loadSampleData()
              localStorage.setItem('ms_demo', 'true')
              setDemoLoaded(true)
              await refresh()
              setStatus('Demo data loaded.')
            }}
          >
            {copy.data.loadDemo}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={async () => {
              await resetSampleData()
              localStorage.setItem('ms_demo', 'false')
              setDemoLoaded(false)
              await refresh()
              setStatus('Demo data reset.')
            }}
            disabled={!demoLoaded}
          >
            {copy.data.resetDemo}
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader>
          <h3 className="card-title">{copy.data.importHistory}</h3>
        </CardHeader>
        {imports.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Import</th>
                <th>Rows</th>
                <th>When</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.filename}</td>
                  <td>{batch.row_count}</td>
                  <td>{new Date(batch.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="secondary" type="button" onClick={() => deleteBatch(batch)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No imports yet." />
        )}
      </Card>

      {status ? <p className="status-text">{status}</p> : null}
    </div>
  )
}
