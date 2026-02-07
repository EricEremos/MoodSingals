import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import InsightCard from '../../components/InsightCard'
import SpendMomentQuickLog from '../../components/SpendMomentQuickLog'
import { db, type MoodLog, type SpendMoment, type Transaction } from '../../data/db'
import { computeInsights, confidenceScore, type InsightCardResult } from '../../data/insights'
import { sameLocalDay } from '../../utils/dates'
import { loadSampleData } from '../../data/sample'

export default function Insights() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<InsightCardResult[]>([])
  const [computeMs, setComputeMs] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(0)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const [spends, logs, tx] = await Promise.all([
        db.spend_moments.toArray(),
        db.mood_logs.toArray(),
        db.transactions.toArray(),
      ])
      setSpendMoments(spends)
      setMoods(logs)
      setTransactions(tx)
    }
    load()
  }, [lastRefresh])

  useEffect(() => {
    const start = performance.now()
    const computed = computeInsights(spendMoments, moods, transactions)
    const sorted = computed.sort((a, b) => {
      const scoreA = confidenceScore(a.confidence.level) * a.relevance
      const scoreB = confidenceScore(b.confidence.level) * b.relevance
      return scoreB - scoreA
    })
    const end = performance.now()
    setComputeMs(Math.round(end - start))
    setCards(sorted)
  }, [spendMoments, moods, transactions])

  const today = new Date()
  const hasSpendToday = spendMoments.some((moment) =>
    sameLocalDay(new Date(moment.created_at), today),
  )
  const hasMoodToday = moods.some((mood) => sameLocalDay(new Date(mood.occurred_at), today))

  const reflectionDue = useMemo(() => {
    if (!spendMoments.length && !moods.length) return false
    const last = Number(localStorage.getItem('ms_reflection_done') || 0)
    if (!last) return true
    return Date.now() - last > 6 * 24 * 60 * 60 * 1000
  }, [spendMoments.length, moods.length, lastRefresh])

  const nextAction = useMemo(() => {
    if (!spendMoments.length && !moods.length && !transactions.length) {
      return {
        title: 'Start with a spend moment',
        description: 'Log one moment or try demo data.',
        primaryLabel: 'Log spend moment',
        primaryAction: 'quicklog',
        secondaryLabel: 'Try demo data',
        secondaryAction: 'demo',
      }
    }
    if (reflectionDue) {
      return {
        title: 'Weekly reflection',
        description: '3 minutes. Simple prompts.',
        primaryLabel: 'Open reflection',
        primaryAction: 'reflection',
        secondaryLabel: 'Log spend moment',
        secondaryAction: 'quicklog',
      }
    }
    if (!hasSpendToday) {
      return {
        title: 'Log a spend moment',
        description: 'Quick entry.',
        primaryLabel: 'Log spend moment',
        primaryAction: 'quicklog',
        secondaryLabel: 'Log mood',
        secondaryAction: 'mood',
      }
    }
    if (!hasMoodToday) {
      return {
        title: 'Log today’s mood',
        description: 'Quick mood check-in.',
        primaryLabel: 'Log mood',
        primaryAction: 'mood',
        secondaryLabel: 'Log spend moment',
        secondaryAction: 'quicklog',
      }
    }
    return {
      title: 'Review insights',
      description: 'Your week at a glance.',
      primaryLabel: 'View insights',
      primaryAction: 'insights',
      secondaryLabel: 'Log spend moment',
      secondaryAction: 'quicklog',
    }
  }, [spendMoments.length, moods.length, transactions.length, reflectionDue, hasSpendToday, hasMoodToday])

  const runAction = async (action: string) => {
    if (action === 'quicklog') {
      setShowQuickLog(true)
      return
    }
    if (action === 'demo') {
      setStatus('Loading demo data...')
      await loadSampleData()
      setStatus('Demo data loaded (not your real data).')
      setLastRefresh(Date.now())
      return
    }
    if (action === 'mood') {
      navigate('/log')
      return
    }
    if (action === 'insights') {
      return
    }
    if (action === 'reflection') {
      const reflection = document.getElementById('reflection')
      reflection?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="section-subtitle">Your week at a glance.</p>
        </div>
      </div>

      {status ? <p className="helper">{status}</p> : null}

      <div className="grid grid-2">
        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Next action</h2>
            </div>
          </div>
          <h3 style={{ marginTop: 0 }}>{nextAction.title}</h3>
          <p className="helper">{nextAction.description}</p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={() => runAction(nextAction.primaryAction)}
            >
              {nextAction.primaryLabel}
            </button>
            <button
              className="button"
              onClick={() => runAction(nextAction.secondaryAction)}
            >
              {nextAction.secondaryLabel}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Quick start</h2>
            </div>
          </div>
          <div className="stepper">
            <div className={`step ${spendMoments.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">1. Log a spend moment</div>
              </div>
              <span className="step-status">{spendMoments.length ? 'Done' : 'Now'}</span>
            </div>
            <div className={`step ${moods.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">2. Log a mood</div>
              </div>
              <span className="step-status">{moods.length ? 'Done' : 'Next'}</span>
            </div>
            <div className={`step ${transactions.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">3. Import history</div>
              </div>
              <span className="step-status">{transactions.length ? 'Done' : 'Optional'}</span>
            </div>
            <div className="inline-list">
              <Link to="/log" className="button button-primary">
                Log now
              </Link>
              <Link to="/import" className="button button-muted">
                Import history
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }} className="card">
        <div className="card-header">
          <div>
            <h2 className="insight-title">Counts</h2>
          </div>
        </div>
        <div className="status-grid">
          <div className="status-row">
            <span>Spend moments</span>
            <span className="status-value">{spendMoments.length}</span>
          </div>
          <div className="status-row">
            <span>Mood logs</span>
            <span className="status-value">{moods.length}</span>
          </div>
          <div className="status-row">
            <span>Imported transactions</span>
            <span className="status-value">{transactions.length}</span>
          </div>
          {computeMs ? (
            <div className="status-row">
              <span>Last compute</span>
              <span className="status-value">{computeMs}ms</span>
            </div>
          ) : null}
        </div>
      </div>

      {reflectionDue ? (
        <div id="reflection" style={{ marginTop: 28 }} className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Weekly reflection</h2>
            </div>
          </div>
          <div className="grid">
            <div className="helper">1) What felt worth it?</div>
            <div className="helper">2) Where did urges show up?</div>
            <div className="helper">3) One small change for next week.</div>
          </div>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={() => {
                localStorage.setItem('ms_reflection_done', String(Date.now()))
                setLastRefresh(Date.now())
              }}
            >
              Mark done
            </button>
            <Link to="/log" className="button">
              Log a moment
            </Link>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Insight cards</h2>
            <p className="section-subtitle">Short, clear, and actionable.</p>
          </div>
        </div>
        <div className="card-feed">
          {cards.map((card) => (
            <InsightCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      {showQuickLog ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3 className="insight-title">Log a spend moment</h3>
              <button className="button button-ghost" onClick={() => setShowQuickLog(false)}>
                Close
              </button>
            </div>
            <SpendMomentQuickLog
              compact
              onSaved={() => {
                setLastRefresh(Date.now())
                setShowQuickLog(false)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
