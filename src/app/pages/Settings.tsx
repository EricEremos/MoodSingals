import { useEffect, useState } from 'react'
import BackupManager from '../../components/BackupManager'
import { db } from '../../data/db'
import { fetchServiceHealth, type ServiceHealth } from '../../lib/serviceApi'
import { exportLocalSnapshot } from '../../lib/localSnapshot'
import { supportiveCopy } from '../../utils/copy'

export default function Settings() {
  const [counts, setCounts] = useState<Counts>(INITIAL_COUNTS)
  const [status, setStatus] = useState('')
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [serviceStatus, setServiceStatus] = useState('Checking server integrations...')

  const applyServiceHealth = (nextHealth: ServiceHealth | null) => {
    setServiceHealth(nextHealth)

    if (!nextHealth) {
      setServiceStatus('API layer unavailable. Local-first mode still works.')
      return
    }

    if (nextHealth.mode === 'connected') {
      setServiceStatus('Generation and Supabase services are configured on the server.')
      return
    }

    if (nextHealth.mode === 'partial') {
      setServiceStatus('Some server integrations are configured, but at least one is incomplete.')
      return
    }

    setServiceStatus('No remote integrations are configured. Local-first mode is active.')
  }

  const refreshLocalCounts = async () => {
    const [importCount, txCount, moodCount, spendCount] = await Promise.all([
      db.imports.count(),
      db.transactions.count(),
      db.mood_logs.count(),
      db.spend_moments.count(),
    ])
    setImports(importCount)
    setTransactions(txCount)
    setMoods(moodCount)
    setSpends(spendCount)
  }

  useEffect(() => {
    const loadCounts = async () => {
      await refreshLocalCounts()
    }

    void loadCounts()
  }, [])

  const refreshServiceHealth = async () => {
    try {
      applyServiceHealth(await fetchServiceHealth())
    } catch {
      applyServiceHealth(null)
    }
  }

  useEffect(() => {
    let active = true

    const loadServiceHealth = async () => {
      try {
        const nextHealth = await fetchServiceHealth()
        if (active) {
          applyServiceHealth(nextHealth)
        }
      } catch {
        if (active) {
          applyServiceHealth(null)
        }
      }
    }

    void loadServiceHealth()

    return () => {
      active = false
    }
  }, [])

  const deleteAll = async () => {
    if (!confirm('Delete all local data?')) return
    await db.delete()
    await db.open()
    await refreshLocalCounts()
    setStatus('All local data deleted.')
  }

  const exportAll = async () => {
    const snapshot = await exportLocalSnapshot()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'moodsignals-export.json'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Exported JSON snapshot.')
  }

  const exportCsv = async () => {
    const [tx, moodsData, spendsData] = await Promise.all([
      db.transactions.toArray(),
      db.mood_logs.toArray(),
      db.spend_moments.toArray(),
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
        lines.push(headers.map((header) => escape(row[header])).join(','))
      }
      return lines.join('\n')
    }

    const files = [
      { name: 'moodsignals-transactions.csv', rows: tx },
      { name: 'moodsignals-moods.csv', rows: moodsData },
      { name: 'moodsignals-spend-moments.csv', rows: spendsData },
    ]

    files.forEach((file) => {
      const blob = new Blob([serialize(file.rows)], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      URL.revokeObjectURL(url)
    })

    setStatus('Exported CSV snapshots.')
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="section-subtitle">Control privacy, exports, backups, and data resets.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Privacy</h3>
          <p className="helper">{supportiveCopy.privacyDisclaimer}</p>
          <p className="helper">
            AI coaching sends a derived digest of local insight cards only when you request it.
          </p>
          <p className="helper">
            Manual backup does not upload anything until you explicitly create a backup.
          </p>
        </div>
        <div className="card">
          <h3>Local data</h3>
          <p className="helper">Spend moments: {spends}</p>
          <p className="helper">Imports: {imports}</p>
          <p className="helper">Transactions: {transactions}</p>
          <p className="helper">Mood logs: {moods}</p>
        </div>
        <p className="body-subtle" style={{ marginTop: 10 }}>
          {copy.settings.signInLabel}
        </p>
        <div className="inline-list" style={{ marginTop: 12 }}>
          <Button
            variant="ghost"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => setStatus(copy.settings.signInPending)}
          >
            {copy.settings.providerGoogle}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => setStatus(copy.settings.signInPending)}
          >
            {copy.settings.providerApple}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => setStatus(copy.settings.signInPending)}
          >
            {copy.settings.providerKakao}
          </Button>
        </div>
        {!ENABLE_SYNC ? <p className="body-subtle">{copy.common.syncOptional}</p> : null}
      </Card>

      <div style={{ marginTop: 20 }} className="card card-elevated">
        <div className="card-header">
          <div>
            <h3>Service integrations</h3>
            <p className="helper">Secrets stay server-side. The browser only calls local API routes.</p>
          </div>
          <button className="button button-muted" onClick={() => void refreshServiceHealth()}>
            Refresh status
          </button>
        </div>

        <p className="helper">{serviceStatus}</p>

        <div style={{ marginTop: 14 }} className="status-grid">
          <div className="status-row">
            <span>Generation provider</span>
            <span
              className={
                serviceHealth?.services.generation.configured ? 'status-ok' : 'status-warn'
              }
            >
              {serviceHealth?.services.generation.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="status-row">
            <span>Model</span>
            <span className="status-value">
              {serviceHealth?.services.generation.model ?? 'Unavailable'}
            </span>
          </div>
          <div className="status-row">
            <span>Provider host</span>
            <span className="status-value">
              {serviceHealth?.services.generation.endpointHost ?? 'Unavailable'}
            </span>
          </div>
          <div className="status-row">
            <span>Supabase backup service</span>
            <span className={serviceHealth?.services.supabase.configured ? 'status-ok' : 'status-warn'}>
              {serviceHealth?.services.supabase.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="status-row">
            <span>Supabase host</span>
            <span className="status-value">
              {serviceHealth?.services.supabase.projectHost ?? 'Unavailable'}
            </span>
          </div>
        </div>

        {serviceHealth?.warnings.length ? (
          <div style={{ marginTop: 14 }} className="grid">
            {serviceHealth.warnings.map((warning) => (
              <p key={warning} className="helper">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 20 }}>
        <BackupManager onDataChanged={refreshLocalCounts} />
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Export & delete</h3>
        <p className="helper">{supportiveCopy.deleteWarning}</p>
        <div className="inline-list">
          <button className="button button-primary" onClick={() => void exportAll()}>
            Export JSON
          </button>
          <button className="button" onClick={() => void exportCsv()}>
            Export CSV
          </button>
          <button className="button" onClick={() => void deleteAll()}>
            Delete all local data
          </button>
          <a href="/settings/debug" className="button button-muted">
            Debug
          </a>
        </div>
      </Card>

      {status ? <p className="status-text">{status}</p> : null}
    </div>
  )
}
