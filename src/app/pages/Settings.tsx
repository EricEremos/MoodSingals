import { useEffect, useState } from 'react'
import { db } from '../../data/db'
import { supportiveCopy } from '../../utils/copy'

export default function Settings() {
  const [imports, setImports] = useState(0)
  const [transactions, setTransactions] = useState(0)
  const [moods, setMoods] = useState(0)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      const [importCount, txCount, moodCount] = await Promise.all([
        db.imports.count(),
        db.transactions.count(),
        db.mood_logs.count(),
      ])
      setImports(importCount)
      setTransactions(txCount)
      setMoods(moodCount)
    }
    load()
  }, [])

  const deleteAll = async () => {
    if (!confirm('Delete all local data? This cannot be undone.')) return
    await db.delete()
    await db.open()
    setStatus('All local data deleted.')
  }

  const exportAll = async () => {
    const [tx, moodsData, batches] = await Promise.all([
      db.transactions.toArray(),
      db.mood_logs.toArray(),
      db.imports.toArray(),
    ])
    const payload = { transactions: tx, mood_logs: moodsData, imports: batches }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'moodsignals-export.json'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Exported JSON snapshot.')
  }

  const exportCsv = async () => {
    const [tx, moodsData] = await Promise.all([
      db.transactions.toArray(),
      db.mood_logs.toArray(),
    ])

    const serialize = (rows: Array<Record<string, unknown>>) => {
      const headers = Array.from(
        rows.reduce<Set<string>>((acc, row) => {
          Object.keys(row).forEach((key) => acc.add(key))
          return acc
        }, new Set()),
      )
      const escape = (value: unknown) => {
        const text = String(value ?? '')
        if (/[",\n]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`
        }
        return text
      }
      const lines = [headers.join(',')]
      for (const row of rows) {
        lines.push(headers.map((h) => escape(row[h])).join(','))
      }
      return lines.join('\n')
    }

    const txBlob = new Blob([serialize(tx)], { type: 'text/csv' })
    const txUrl = URL.createObjectURL(txBlob)
    const txLink = document.createElement('a')
    txLink.href = txUrl
    txLink.download = 'moodsignals-transactions.csv'
    txLink.click()
    URL.revokeObjectURL(txUrl)

    const moodBlob = new Blob([serialize(moodsData)], { type: 'text/csv' })
    const moodUrl = URL.createObjectURL(moodBlob)
    const moodLink = document.createElement('a')
    moodLink.href = moodUrl
    moodLink.download = 'moodsignals-moods.csv'
    moodLink.click()
    URL.revokeObjectURL(moodUrl)

    setStatus('Exported CSV snapshots.')
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="section-subtitle">Control privacy, exports, and data resets.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Privacy & Tone</h3>
          <p className="helper">{supportiveCopy.privacyDisclaimer}</p>
          <p className="helper">{supportiveCopy.sensitiveDisclaimer}</p>
        </div>
        <div className="card">
          <h3>Local Data Summary</h3>
          <p className="helper">Imports: {imports}</p>
          <p className="helper">Transactions: {transactions}</p>
          <p className="helper">Mood logs: {moods}</p>
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Export & Delete</h3>
        <p className="helper">{supportiveCopy.deleteWarning}</p>
        <div className="inline-list">
          <button className="button button-primary" onClick={exportAll}>
            Export JSON
          </button>
          <button className="button" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="button" onClick={deleteAll}>
            Delete All Data
          </button>
          <a href="/settings/debug" className="button button-muted">
            Debug
          </a>
        </div>
        {status ? <p className="helper">{status}</p> : null}
      </div>
    </div>
  )
}
