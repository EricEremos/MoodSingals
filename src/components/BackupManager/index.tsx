import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  createBackup,
  getBackup,
  listBackups,
  type BackupRecord,
} from '../../lib/serviceApi'
import {
  exportLocalSnapshot,
  getSnapshotStats,
  restoreLocalSnapshot,
} from '../../lib/localSnapshot'
import {
  getCurrentSession,
  getSupabaseBrowserClient,
  publicSupabaseUrl,
  supabaseAuthEnabled,
} from '../../lib/supabaseClient'

export default function BackupManager({
  onDataChanged,
}: {
  onDataChanged?: () => Promise<void> | void
}) {
  const client = useMemo(() => getSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [status, setStatus] = useState('')
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [savingBackup, setSavingBackup] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return

    let active = true

    const loadSession = async () => {
      const nextSession = await getCurrentSession()
      if (active) {
        setSession(nextSession)
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  const refreshBackups = useCallback(
    async (currentSession: Session | null = session) => {
      if (!currentSession) {
        setBackups([])
        return
      }

      setLoadingBackups(true)
      try {
        setBackups(await listBackups(currentSession.access_token))
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not load backups.')
      } finally {
        setLoadingBackups(false)
      }
    },
    [session],
  )

  useEffect(() => {
    void refreshBackups(session)
  }, [session, refreshBackups])

  const sendMagicLink = async () => {
    if (!client || !email.trim()) return

    setSendingLink(true)
    setStatus('')

    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/settings`,
        },
      })

      if (error) {
        throw error
      }

      setStatus('Magic link sent. Open it on this device to enable backups.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send the magic link.')
    } finally {
      setSendingLink(false)
    }
  }

  const signOut = async () => {
    if (!client) return
    await client.auth.signOut()
    setBackups([])
    setStatus('Signed out. Local data remains on this device.')
  }

  const createManualBackup = async () => {
    if (!session) return

    setSavingBackup(true)
    setStatus('')

    try {
      const snapshot = await exportLocalSnapshot()
      const stats = getSnapshotStats(snapshot)
      const label = `Backup ${new Date().toLocaleString()}`
      await createBackup(session.access_token, { label, snapshot })
      await refreshBackups(session)
      setStatus(
        `Backup saved with ${stats.transactions} transactions and ${stats.spendMoments} spend moments.`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create a backup.')
    } finally {
      setSavingBackup(false)
    }
  }

  const restoreBackup = async (backup: BackupRecord) => {
    if (!session) return
    if (!confirm(`Restore "${backup.label}" to this device? Current local data will be replaced.`)) {
      return
    }

    setRestoringId(backup.id)
    setStatus('')

    try {
      const fullBackup = await getBackup(session.access_token, backup.id)
      if (!fullBackup.payload_json) {
        throw new Error('Backup payload is missing.')
      }
      await restoreLocalSnapshot(fullBackup.payload_json)
      await onDataChanged?.()
      setStatus('Backup restored to this device.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not restore the selected backup.')
    } finally {
      setRestoringId(null)
    }
  }

  if (!supabaseAuthEnabled) {
    return (
      <div className="card card-elevated">
        <h3>Backup sync</h3>
        <p className="helper">Manual backup requires Supabase email auth.</p>
        <p className="helper">
          Add a public auth key as <code>VITE_SUPABASE_ANON_KEY</code> to enable sign-in.
        </p>
        <p className="helper">Current public URL: {publicSupabaseUrl || 'Unavailable'}</p>
      </div>
    )
  }

  return (
    <div className="card card-elevated">
      <div className="card-header">
        <div>
          <h3>Backup sync</h3>
          <p className="helper">Manual backup keeps local-first behavior while enabling recovery.</p>
        </div>
      </div>

      {session ? (
        <div className="grid" style={{ gap: 16 }}>
          <div className="status-row">
            <span>Signed in</span>
            <span className="status-value">{session.user.email || 'Authenticated user'}</span>
          </div>
          <div className="inline-list">
            <button
              className="button button-primary"
              onClick={createManualBackup}
              disabled={savingBackup}
            >
              {savingBackup ? 'Saving backup...' : 'Create backup'}
            </button>
            <button className="button button-muted" onClick={() => void refreshBackups()}>
              Refresh backups
            </button>
            <button className="button" onClick={signOut}>
              Sign out
            </button>
          </div>

          {loadingBackups ? <p className="helper">Loading backups...</p> : null}

          {backups.length ? (
            <div className="status-grid">
              {backups.map((backup) => (
                <div key={backup.id} className="card" style={{ padding: 16 }}>
                  <div className="status-row">
                    <span>{backup.label}</span>
                    <span className="status-value">
                      {new Date(backup.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="helper" style={{ marginTop: 8 }}>
                    Transactions: {backup.stats_json.transactions ?? 0} · Spend moments:{' '}
                    {backup.stats_json.spendMoments ?? 0} · Mood logs:{' '}
                    {backup.stats_json.moodLogs ?? 0}
                  </p>
                  <div style={{ marginTop: 12 }} className="inline-list">
                    <button
                      className="button button-primary"
                      onClick={() => void restoreBackup(backup)}
                      disabled={restoringId === backup.id}
                    >
                      {restoringId === backup.id ? 'Restoring...' : 'Restore to this device'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="helper">No backups yet. Create one after signing in.</p>
          )}
        </div>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          <label className="helper">Email for backup access</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <div className="inline-list">
            <button
              className="button button-primary"
              onClick={sendMagicLink}
              disabled={sendingLink || !email.trim()}
            >
              {sendingLink ? 'Sending link...' : 'Email sign-in link'}
            </button>
          </div>
          <p className="helper">
            Backups stay explicit. Local data is not uploaded until you create a backup.
          </p>
        </div>
      )}

      {status ? <p className="helper">{status}</p> : null}
    </div>
  )
}
