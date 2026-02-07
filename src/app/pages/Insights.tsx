import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CSVWizard from '../../components/CSVWizard'
import MoodCheckin from '../../components/MoodCheckin'
import InsightCard from '../../components/InsightCard'
import { db, type MoodLog, type Transaction } from '../../data/db'
import { computeInsights, confidenceScore, type InsightCardResult } from '../../data/insights'
import { supportiveCopy } from '../../utils/copy'

export default function Insights() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [cards, setCards] = useState<InsightCardResult[]>([])
  const [computeMs, setComputeMs] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(0)
  const [activeGuide, setActiveGuide] = useState<'start' | 'import' | 'checkin' | 'privacy'>(
    'start',
  )

  useEffect(() => {
    const load = async () => {
      const [tx, logs] = await Promise.all([
        db.transactions.toArray(),
        db.mood_logs.toArray(),
      ])
      setTransactions(tx)
      setMoods(logs)
    }
    load()
  }, [lastRefresh])

  useEffect(() => {
    const start = performance.now()
    const computed = computeInsights(transactions, moods)
    const sorted = computed.sort((a, b) => {
      const scoreA = confidenceScore(a.confidence.level) * a.relevance
      const scoreB = confidenceScore(b.confidence.level) * b.relevance
      return scoreB - scoreA
    })
    const end = performance.now()
    setComputeMs(Math.round(end - start))
    setCards(sorted)

    const updateCompute = async () => {
      const latest = await db.imports.orderBy('created_at').reverse().first()
      if (latest) {
        await db.imports.update(latest.id, { compute_ms: Math.round(end - start) })
      }
    }
    updateCompute()
  }, [transactions, moods])

  const hasTransactions = transactions.length > 0
  const hasMoods = moods.length > 0
  const unlocked = hasTransactions && hasMoods
  const lowConfidenceCount = useMemo(
    () => cards.filter((card) => card.confidence.level === 'Low').length,
    [cards],
  )

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="section-subtitle">
            Confidence-weighted signals connecting mood, spend, and outcomes. No cloud required.
          </p>
        </div>
        <div className="tag">Local-first</div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="insight-title">First success path</h2>
              <p className="helper">Finish steps 1–2 to unlock the eight insight cards.</p>
            </div>
            <span className="pill">~2 minutes</span>
          </div>

          <div className="tabs" role="tablist" aria-label="Guide tabs">
            {[
              ['start', 'Start'],
              ['import', 'Import'],
              ['checkin', 'Check-in'],
              ['privacy', 'Privacy'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`tab ${activeGuide === key ? 'tab-active' : ''}`}
                onClick={() => setActiveGuide(key as typeof activeGuide)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {activeGuide === 'start' ? (
            <div className="stepper">
              <div className={`step ${hasTransactions ? 'step-done' : ''}`}>
                <div>
                  <div className="step-title">1. Import a CSV</div>
                  <div className="helper">We only read locally in your browser.</div>
                </div>
                <span className="step-status">{hasTransactions ? 'Done' : 'Required'}</span>
              </div>
              <div className={`step ${hasMoods ? 'step-done' : ''}`}>
                <div>
                  <div className="step-title">2. Log a mood</div>
                  <div className="helper">A 5–10 second check-in is enough.</div>
                </div>
                <span className="step-status">{hasMoods ? 'Done' : 'Required'}</span>
              </div>
              <div className={`step ${unlocked ? 'step-done' : ''}`}>
                <div>
                  <div className="step-title">3. Review insights</div>
                  <div className="helper">Signals update automatically.</div>
                </div>
                <span className="step-status">{unlocked ? 'Unlocked' : 'Locked'}</span>
              </div>
              <div className="inline-list">
                <a href="#import" className="button button-primary">
                  Import CSV
                </a>
                <a href="#checkin" className="button">
                  Mood check-in
                </a>
              </div>
            </div>
          ) : null}

          {activeGuide === 'import' ? (
            <div style={{ marginTop: 12 }}>
              <p className="helper">
                Use bank exports (CSV). Map date + amount, then normalize. We never upload the file.
              </p>
              <div className="inline-list" style={{ marginTop: 12 }}>
                <span className="pill">CSV only</span>
                <span className="pill">IndexedDB storage</span>
                <a href="#import" className="button button-primary">
                  Go to import
                </a>
              </div>
            </div>
          ) : null}

          {activeGuide === 'checkin' ? (
            <div style={{ marginTop: 12 }}>
              <p className="helper">
                Pick one mood and optionally add up to two tags. No diagnosis, just signals.
              </p>
              <div className="inline-list" style={{ marginTop: 12 }}>
                <span className="pill">10 seconds</span>
                <span className="pill">2 optional tags</span>
                <a href="#checkin" className="button button-primary">
                  Log a mood
                </a>
              </div>
            </div>
          ) : null}

          {activeGuide === 'privacy' ? (
            <div style={{ marginTop: 12 }}>
              <p className="helper">{supportiveCopy.privacyDisclaimer}</p>
              <p className="helper">{supportiveCopy.sensitiveDisclaimer}</p>
              <div className="inline-list" style={{ marginTop: 12 }}>
                <Link to="/settings" className="button button-primary">
                  Privacy controls
                </Link>
                <span className="pill">Local only</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Data status</h2>
              <p className="helper">All counts are stored on this device only.</p>
            </div>
            <span className="pill">{unlocked ? 'Insights unlocked' : 'Unlock pending'}</span>
          </div>
          <div className="status-grid">
            <div className="status-row">
              <span>Transactions</span>
              <span className="status-value">{transactions.length}</span>
            </div>
            <div className="status-row">
              <span>Mood logs</span>
              <span className="status-value">{moods.length}</span>
            </div>
            <div className="status-row">
              <span>Insight cards</span>
              <span className="status-value">{cards.length || 0}</span>
            </div>
            {computeMs ? (
              <div className="status-row">
                <span>Last compute</span>
                <span className="status-value">{computeMs}ms</span>
              </div>
            ) : null}
            {lastRefresh ? (
              <div className="status-row">
                <span>Last update</span>
                <span className="status-value">
                  {new Date(lastRefresh).toLocaleTimeString()}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div id="import" style={{ marginTop: 28 }}>
        <CSVWizard onImported={() => setLastRefresh(Date.now())} />
      </div>

      <div id="checkin" style={{ marginTop: 28 }}>
        <MoodCheckin onSaved={() => setLastRefresh(Date.now())} />
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Insight cards</h2>
            <p className="section-subtitle">
              Signals update after each import or mood check-in. Confidence reflects data coverage.
            </p>
          </div>
        </div>

        {!unlocked ? (
          <div className="empty-state">
            Import a CSV and log a mood to unlock insights. Your data never leaves this device.
          </div>
        ) : (
          <>
            {lowConfidenceCount ? (
              <div className="card card-elevated" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <div>
                    <h3 className="insight-title">Low confidence signals</h3>
                    <p className="helper">
                      {lowConfidenceCount} cards are low confidence. Add more days of data or more
                      mood check-ins to strengthen signal quality.
                    </p>
                  </div>
                  <span className="pill">Needs more data</span>
                </div>
              </div>
            ) : null}
            <div className="card-feed">
              {cards.map((card) => (
                <InsightCard key={card.id} card={card} />
              ))}
            </div>
          </>
        )}
        <p className="helper" style={{ marginTop: 16 }}>
          {supportiveCopy.privacyDisclaimer}
        </p>
      </div>
    </div>
  )
}
