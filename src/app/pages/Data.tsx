import { useEffect, useState } from 'react'
import { db, type ImportBatch, type MoodLog } from '../../data/db'
import { MOODS } from '../../data/insights/moods'
import { browserTimeZone, toISO } from '../../utils/dates'
import { sha256 } from '../../utils/hash'

export default function Data() {
  const [imports, setImports] = useState<ImportBatch[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      const batches = await db.imports.orderBy('created_at').reverse().toArray()
      setImports(batches)
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

  const loadSampleMoods = async () => {
    const moodByLabel = MOODS.reduce<Record<string, (typeof MOODS)[number]>>((acc, mood) => {
      acc[mood.label] = mood
      return acc
    }, {})

    const samples = [
      { label: 'Focused', at: '2026-01-02T08:40:00' },
      { label: 'Stressed', at: '2026-01-03T18:10:00' },
      { label: 'Content', at: '2026-01-04T12:00:00' },
      { label: 'Anxious', at: '2026-01-05T21:30:00' },
      { label: 'Happy', at: '2026-01-06T19:15:00' },
      { label: 'Tired', at: '2026-01-07T23:10:00' },
    ]

    const entries: MoodLog[] = []
    for (const sample of samples) {
      const mood = moodByLabel[sample.label]
      if (!mood) continue
      const occurredAt = new Date(sample.at)
      const id = await sha256(`${mood.label}-${occurredAt.toISOString()}`)
      entries.push({
        id,
        occurred_at: toISO(occurredAt),
        timezone: browserTimeZone,
        mood_label: mood.label,
        mood_emoji: mood.emoji,
        mood_valence: mood.valence,
        mood_arousal: mood.arousal,
        tags: [],
        note: 'Demo mood check-in',
        created_at: toISO(new Date()),
      })
    }

    await db.mood_logs.bulkPut(entries)
    setStatus('Loaded demo mood logs.')
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Data</h1>
          <p className="section-subtitle">Import batches stored locally in IndexedDB.</p>
        </div>
      </div>
      <div className="card">
        <div className="inline-list" style={{ marginBottom: 12 }}>
          <button className="button button-primary" onClick={loadSampleMoods}>
            Load Demo Mood Logs
          </button>
          {status ? <span className="helper">{status}</span> : null}
        </div>
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
                    Delete Batch
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
