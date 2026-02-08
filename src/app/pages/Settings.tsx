import { useEffect, useState } from 'react'
import { db } from '../../data/db'
import { supportiveCopy } from '../../utils/copy'
import { loadSampleData, resetSampleData } from '../../data/sample'
import { decryptJsonValue, encryptJsonValue } from '../../data/sync/crypto'
import {
  getMe,
  getVault,
  loginFinish,
  loginStart,
  logout,
  putVault,
  registerFinish,
  registerStart,
} from '../../data/sync/client'
import { createPasskey, getPasskeyAssertion } from '../../data/sync/webauthn'
import {
  exportVaultSnapshot,
  importVaultSnapshot,
  mergeVaultSnapshots,
  type VaultSnapshot,
} from '../../data/sync/vault'

export default function Settings() {
  const [imports, setImports] = useState(0)
  const [transactions, setTransactions] = useState(0)
  const [moods, setMoods] = useState(0)
  const [spends, setSpends] = useState(0)
  const [status, setStatus] = useState('')
  const [demoMode, setDemoMode] = useState(
    localStorage.getItem('ms_demo') === 'true',
  )
  const [researchMode, setResearchMode] = useState(
    localStorage.getItem('ms_research_mode') === 'true',
  )
  const [anonMetrics, setAnonMetrics] = useState(
    localStorage.getItem('ms_anon_metrics') === 'true',
  )
  const [syncPassphrase, setSyncPassphrase] = useState('')
  const [syncUserId, setSyncUserId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)

  const refreshCounts = async () => {
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
    const load = async () => {
      await refreshCounts()
    }
    load()
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const me = await getMe()
        setSyncUserId(me.user_id)
      } catch {
        setSyncUserId(null)
      }
    }
    loadSession()
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
    const spendsData = await db.spend_moments.toArray()
    const payload = {
      spend_moments: spendsData,
      transactions: tx,
      mood_logs: moodsData,
      imports: batches,
    }
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

    const spendBlob = new Blob([serialize(spendsData)], { type: 'text/csv' })
    const spendUrl = URL.createObjectURL(spendBlob)
    const spendLink = document.createElement('a')
    spendLink.href = spendUrl
    spendLink.download = 'moodsignals-spend-moments.csv'
    spendLink.click()
    URL.revokeObjectURL(spendUrl)

    setStatus('Exported CSV snapshots.')
  }

  const exportSummary = async () => {
    const [spendsData, moodsData] = await Promise.all([
      db.spend_moments.toArray(),
      db.mood_logs.toArray(),
    ])
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentSpends = spendsData.filter(
      (entry) => new Date(entry.created_at).getTime() >= weekAgo,
    )
    const recentMoods = moodsData.filter(
      (entry) => new Date(entry.occurred_at).getTime() >= weekAgo,
    )

    const topCategories = recentSpends.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {})
    const topTags = recentSpends.reduce<Record<string, number>>((acc, entry) => {
      entry.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {})

    const payload = {
      generated_at: new Date().toISOString(),
      totals: {
        spend_moments: spendsData.length,
        mood_logs: moodsData.length,
      },
      last_7_days: {
        spend_moments: recentSpends.length,
        mood_logs: recentMoods.length,
        top_categories: topCategories,
        top_tags: topTags,
      },
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'moodsignals-summary.json'
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Exported summary.')
  }

  const toggleDemo = async () => {
    const next = !demoMode
    setDemoMode(next)
    localStorage.setItem('ms_demo', String(next))
    if (next) {
      await loadSampleData()
      setStatus('Demo data loaded.')
    } else {
      await resetSampleData()
      setStatus('Demo data cleared.')
    }
  }

  const toggleResearchMode = () => {
    const next = !researchMode
    setResearchMode(next)
    localStorage.setItem('ms_research_mode', String(next))
  }

  const toggleAnonMetrics = () => {
    const next = !anonMetrics
    setAnonMetrics(next)
    localStorage.setItem('ms_anon_metrics', String(next))
  }

  const ensurePassphrase = () => {
    if (!syncPassphrase.trim()) {
      throw new Error('Set a sync passphrase first.')
    }
  }

  const registerPasskey = async () => {
    setSyncBusy(true)
    try {
      const start = await registerStart()
      const credential = await createPasskey(start.options as Parameters<typeof createPasskey>[0])
      const finish = await registerFinish({
        user_id: start.user_id,
        request_id: start.request_id,
        credential,
      })
      setSyncUserId(finish.user_id)
      setSyncStatus('Passkey created. Encrypted sync is ready.')
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Could not create passkey.')
    } finally {
      setSyncBusy(false)
    }
  }

  const signInPasskey = async () => {
    setSyncBusy(true)
    try {
      const start = await loginStart(syncUserId || undefined)
      const credential = await getPasskeyAssertion(
        start.options as Parameters<typeof getPasskeyAssertion>[0],
      )
      const finish = await loginFinish({
        request_id: start.request_id,
        credential,
      })
      setSyncUserId(finish.user_id)
      setSyncStatus('Signed in. You can sync encrypted data.')
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Could not sign in with passkey.')
    } finally {
      setSyncBusy(false)
    }
  }

  const signOutPasskey = async () => {
    setSyncBusy(true)
    try {
      await logout()
      setSyncUserId(null)
      setSyncStatus('Signed out.')
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Could not sign out.')
    } finally {
      setSyncBusy(false)
    }
  }

  const pushEncryptedSync = async () => {
    setSyncBusy(true)
    try {
      ensurePassphrase()
      const localSnapshot = await exportVaultSnapshot()
      const remoteVault = await getVault()
      let mergedSnapshot: VaultSnapshot = localSnapshot

      if (remoteVault?.ciphertext) {
        const remoteSnapshot = await decryptJsonValue<VaultSnapshot>(
          remoteVault.ciphertext,
          syncPassphrase,
          remoteVault.salt,
        )
        mergedSnapshot = mergeVaultSnapshots(localSnapshot, remoteSnapshot)
      }

      const encrypted = await encryptJsonValue(
        mergedSnapshot,
        syncPassphrase,
        remoteVault?.salt,
      )
      const nextVersion = (remoteVault?.version || 0) + 1
      await putVault({
        ciphertext: encrypted.ciphertext,
        salt: encrypted.salt,
        version: nextVersion,
      })
      setSyncStatus('Encrypted sync uploaded.')
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Encrypted sync failed.')
    } finally {
      setSyncBusy(false)
    }
  }

  const pullEncryptedSync = async () => {
    setSyncBusy(true)
    try {
      ensurePassphrase()
      const remoteVault = await getVault()
      if (!remoteVault?.ciphertext) {
        setSyncStatus('No encrypted backup found yet.')
        return
      }
      const remoteSnapshot = await decryptJsonValue<VaultSnapshot>(
        remoteVault.ciphertext,
        syncPassphrase,
        remoteVault.salt,
      )
      const localSnapshot = await exportVaultSnapshot()
      const merged = mergeVaultSnapshots(localSnapshot, remoteSnapshot)
      await importVaultSnapshot(merged, true)
      await refreshCounts()
      setSyncStatus('Encrypted sync restored.')
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Could not restore encrypted sync.')
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="section-subtitle">Local data, encrypted sync, and study tools.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Privacy</h3>
          <p className="helper">{supportiveCopy.privacyDisclaimer}</p>
          <p className="helper">{supportiveCopy.patternLens}</p>
          <p className="helper">{supportiveCopy.encryptedSync}</p>
        </div>
        <div className="card">
          <h3>Counts</h3>
          <p className="helper">Spend moments: {spends}</p>
          <p className="helper">Imports: {imports}</p>
          <p className="helper">Transactions: {transactions}</p>
          <p className="helper">Mood logs: {moods}</p>
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Export / delete</h3>
        <p className="helper">{supportiveCopy.deleteWarning}</p>
        <div className="inline-list">
          <button className="button button-primary" onClick={exportAll}>
            Export JSON
          </button>
          <button className="button" onClick={exportSummary}>
            Export summary
          </button>
          <button className="button" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="button" onClick={deleteAll}>
            Delete data
          </button>
          <a href="/settings/debug" className="button button-muted">
            Debug
          </a>
        </div>
        {status ? <p className="helper">{status}</p> : null}
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Encrypted sync (optional)</h3>
        <p className="helper">Your data is encrypted before it leaves your device.</p>
        <p className="helper">We cannot read your transactions or mood notes.</p>
        <p className="helper">If you forget your sync passphrase, we cannot recover your data.</p>
        <div className="grid" style={{ marginTop: 12 }}>
          <input
            className="input"
            type="password"
            value={syncPassphrase}
            onChange={(event) => setSyncPassphrase(event.target.value)}
            placeholder="Set sync passphrase"
          />
          <div className="inline-list">
            <button className="button button-primary" onClick={registerPasskey} disabled={syncBusy}>
              Create passkey
            </button>
            <button className="button" onClick={signInPasskey} disabled={syncBusy}>
              Sign in with passkey
            </button>
            {syncUserId ? (
              <button className="button button-muted" onClick={signOutPasskey} disabled={syncBusy}>
                Sign out
              </button>
            ) : null}
          </div>
          <div className="inline-list">
            <button className="button" onClick={pushEncryptedSync} disabled={syncBusy || !syncUserId}>
              Sync now
            </button>
            <button className="button" onClick={pullEncryptedSync} disabled={syncBusy || !syncUserId}>
              Restore latest
            </button>
          </div>
          <p className="helper">
            Account: {syncUserId ? `Signed in (${syncUserId.slice(0, 8)}...)` : 'Not signed in'}
          </p>
          {syncStatus ? <p className="helper">{syncStatus}</p> : null}
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Demo data</h3>
        <div className="inline-list">
          <button className="button" onClick={toggleDemo}>
            {demoMode ? 'Clear demo data' : 'Load demo data'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Anonymous UX metrics</h3>
        <p className="helper">Off by default.</p>
        <div className="inline-list">
          <button className="button" onClick={toggleAnonMetrics}>
            {anonMetrics ? 'Disable metrics' : 'Enable metrics'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <h3>Study mode</h3>
        <div className="inline-list">
          <button className="button" onClick={toggleResearchMode}>
            {researchMode ? 'Disable study mode' : 'Enable study mode'}
          </button>
          {researchMode ? (
            <a href="/study-mode" className="button button-muted">
              Open study mode
            </a>
          ) : null}
          <a href="/case-study" className="button button-muted">
            Case study
          </a>
        </div>
      </div>
    </div>
  )
}
