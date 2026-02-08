import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { db } from '../../data/db'
import { copy } from '../../utils/copy'
import { ENABLE_SYNC } from '../../config/flags'
import { exportJsonSnapshot, importJsonSnapshot } from '../../data/transfer/json'
import { exportCsvSnapshots } from '../../data/transfer/csv'
import { clearOnboardingSuppression } from '../../utils/onboarding'

type Counts = {
  imports: number
  transactions: number
  moods: number
  spends: number
}

const INITIAL_COUNTS: Counts = {
  imports: 0,
  transactions: 0,
  moods: 0,
  spends: 0,
}

export default function Settings() {
  const [counts, setCounts] = useState<Counts>(INITIAL_COUNTS)
  const [status, setStatus] = useState('')
  const [syncStatus, setSyncStatus] = useState('')
  const jsonInputRef = useRef<HTMLInputElement | null>(null)

  const refreshCounts = async () => {
    const [importCount, txCount, moodCount, spendCount] = await Promise.all([
      db.imports.count(),
      db.transactions.count(),
      db.mood_logs.count(),
      db.spend_moments.count(),
    ])

    setCounts({
      imports: importCount,
      transactions: txCount,
      moods: moodCount,
      spends: spendCount,
    })
  }

  useEffect(() => {
    refreshCounts()
  }, [])

  const deleteAll = async () => {
    if (!confirm('Delete all local data?')) return
    await db.delete()
    await db.open()
    await refreshCounts()
    setStatus('All local data deleted.')
  }

  const onImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await importJsonSnapshot(file, { replace: false })
      await refreshCounts()
      setStatus('Data imported.')
    } catch {
      setStatus('Could not import JSON.')
    } finally {
      event.target.value = ''
    }
  }

  const onProviderClick = (provider: string) => {
    setSyncStatus(`${provider} auth placeholder.`)
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.settings.title}</h2>
          <p className="page-subtitle">{copy.settings.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3 className="card-title">{copy.settings.countTitle}</h3>
          <div className="metric-list" style={{ marginTop: 12 }}>
            <div className="metric-row">
              <span>{copy.settings.countMoods}</span>
              <strong>{counts.moods}</strong>
            </div>
            <div className="metric-row">
              <span>{copy.settings.countSpends}</span>
              <strong>{counts.spends}</strong>
            </div>
            <div className="metric-row">
              <span>{copy.settings.countTransactions}</span>
              <strong>{counts.transactions}</strong>
            </div>
            <div className="metric-row">
              <span>{copy.settings.countImports}</span>
              <strong>{counts.imports}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="card-title">{copy.settings.privacyTitle}</h3>
          <p className="body-subtle">{copy.settings.privacySubtitle}</p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              type="button"
              onClick={async () => {
                await exportJsonSnapshot()
                setStatus('Data exported.')
              }}
            >
              {copy.common.exportData}
            </button>
            <button className="button" type="button" onClick={() => jsonInputRef.current?.click()}>
              {copy.common.importData}
            </button>
            <button
              className="button button-muted"
              type="button"
              onClick={async () => {
                await exportCsvSnapshots()
                setStatus('CSV exported.')
              }}
            >
              {copy.data.csvExport}
            </button>
            <button className="button button-muted" type="button" onClick={deleteAll}>
              {copy.common.deleteAll}
            </button>
          </div>
          <p className="body-subtle">{copy.settings.deleteWarning}</p>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            className="input"
            style={{ display: 'none' }}
            onChange={onImportJson}
          />
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">{copy.settings.accountTitle}</h3>
        <p className="body-subtle">{copy.settings.accountSubtitle}</p>
        <div className="status-chip" style={{ marginTop: 10 }}>{copy.settings.localMode}</div>

        {!ENABLE_SYNC ? <p className="body-subtle">{copy.common.syncOptional}</p> : null}

        <div className="inline-list" style={{ marginTop: 12 }}>
          <button
            className="button button-primary"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => onProviderClick('Google')}
          >
            {copy.settings.providerGoogle}
          </button>
          <button
            className="button"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => onProviderClick('Apple')}
          >
            {copy.settings.providerApple}
          </button>
          <button
            className="button"
            type="button"
            disabled={!ENABLE_SYNC}
            onClick={() => onProviderClick('Kakao')}
          >
            {copy.settings.providerKakao}
          </button>
          <button className="button button-muted" type="button" disabled={!ENABLE_SYNC}>
            {copy.settings.signInLabel}
          </button>
        </div>

        <p className="body-subtle">{ENABLE_SYNC ? copy.settings.syncStatusOn : copy.settings.syncStatusOff}</p>
        {syncStatus ? <p className="status-text">{syncStatus}</p> : null}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">{copy.settings.tutorialTitle}</h3>
        <div className="inline-list" style={{ marginTop: 12 }}>
          <button
            className="button button-muted"
            type="button"
            onClick={() => {
              clearOnboardingSuppression()
              setStatus(copy.settings.resetTutorialDone)
            }}
          >
            {copy.settings.resetTutorial}
          </button>
        </div>
      </section>

      {status ? <p className="status-text">{status}</p> : null}
    </div>
  )
}
