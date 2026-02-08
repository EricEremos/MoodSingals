import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { db } from '../../data/db'
import { copy } from '../../utils/copy'
import { exportJsonSnapshot, importJsonSnapshot } from '../../data/transfer/json'
import { exportCsvSnapshots } from '../../data/transfer/csv'
import { clearOnboardingSuppression, requestOnboardingGuideOpen } from '../../utils/onboarding'
import { ENABLE_SYNC } from '../../config/flags'
import { Button, Card } from '../../components/ui'

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

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.settings.title}</h2>
        </div>
      </div>

      <div className="grid grid-2">
        <Card>
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
        </Card>

        <Card>
          <h3 className="card-title">{copy.settings.privacyTitle}</h3>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <Button
              variant="primary"
              type="button"
              onClick={async () => {
                await exportJsonSnapshot()
                setStatus('Data exported.')
              }}
            >
              {copy.common.exportData}
            </Button>
            <Button variant="ghost" type="button" onClick={() => jsonInputRef.current?.click()}>
              {copy.common.importData}
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
            <Button variant="destructive" type="button" onClick={deleteAll}>
              {copy.common.deleteAll}
            </Button>
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
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h3 className="card-title">{copy.settings.accountTitle}</h3>
        <div className="metric-list" style={{ marginTop: 12 }}>
          <p className="body-subtle">{copy.settings.accountLineOne}</p>
          <p className="body-subtle">{copy.settings.accountLineTwo}</p>
          <p className="body-subtle">{copy.settings.accountLineThree}</p>
        </div>
        <div className="inline-list" style={{ marginTop: 12 }}>
          <span className={ENABLE_SYNC ? 'status-ok' : 'status-warn'}>
            {ENABLE_SYNC ? copy.settings.syncStatusOn : copy.settings.syncStatusOff}
          </span>
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

      <Card style={{ marginTop: 16 }}>
        <h3 className="card-title">{copy.settings.tutorialTitle}</h3>
        <div className="inline-list" style={{ marginTop: 12 }}>
          <Button variant="primary" type="button" onClick={requestOnboardingGuideOpen}>
            {copy.settings.openHelp}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              clearOnboardingSuppression()
              setStatus(copy.settings.resetTutorialDone)
            }}
          >
            {copy.settings.resetTutorial}
          </Button>
        </div>
      </Card>

      {status ? <p className="status-text">{status}</p> : null}
    </div>
  )
}
