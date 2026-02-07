import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import InsightCard from '../../components/InsightCard'
import { db, type MoodLog, type SpendMoment, type Transaction, type TxMoodAnnotation } from '../../data/db'
import { computeInsights, confidenceScore } from '../../data/insights'
import type { IndexResult } from '../../data/indices/types'
import { linkTransactionsToMood } from '../../data/insights/linkMood'
import { sameLocalDay } from '../../utils/dates'
import { loadSampleData } from '../../data/sample'
import { getDailyStreak } from '../../utils/streak'
import { supportiveCopy } from '../../utils/copy'

export default function Insights() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [annotations, setAnnotations] = useState<TxMoodAnnotation[]>([])
  const [cards, setCards] = useState<IndexResult[]>([])
  const [lastRefresh, setLastRefresh] = useState(0)
  const [status, setStatus] = useState('')
  const [taggedCount, setTaggedCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [spends, logs, tx, tagged, ann] = await Promise.all([
        db.spend_moments.toArray(),
        db.mood_logs.toArray(),
        db.transactions.toArray(),
        db.tx_mood_annotations.count(),
        db.tx_mood_annotations.toArray(),
      ])
      setSpendMoments(spends)
      setMoods(logs)
      setTransactions(tx)
      setTaggedCount(tagged)
      setAnnotations(ann)
    }
    load()
  }, [lastRefresh])

  useEffect(() => {
    const computed = computeInsights(spendMoments, moods, transactions, annotations)
    const sorted = computed.sort((a, b) => {
      const scoreA = confidenceScore(a.confidence.level) * a.relevance
      const scoreB = confidenceScore(b.confidence.level) * b.relevance
      return scoreB - scoreA
    })
    setCards(sorted)
  }, [spendMoments, moods, transactions, annotations])

  const today = new Date()
  const hasSpendToday = spendMoments.some((moment) =>
    sameLocalDay(new Date(moment.created_at), today),
  )
  const hasMoodToday = moods.some((mood) => sameLocalDay(new Date(mood.occurred_at), today))
  const hasImport = transactions.length > 0

  const reflectionDue = useMemo(() => {
    if (!spendMoments.length && !moods.length) return false
    const last = Number(localStorage.getItem('ms_reflection_done') || 0)
    if (!last) return true
    return Date.now() - last > 6 * 24 * 60 * 60 * 1000
  }, [spendMoments.length, moods.length, lastRefresh])

  const readiness = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const moodsThisWeek = moods.filter(
      (entry) => new Date(entry.occurred_at).getTime() >= weekAgo,
    ).length
    const spendLast30 =
      spendMoments.filter((entry) => new Date(entry.created_at).getTime() >= monthAgo).length +
      transactions.filter((entry) => new Date(entry.occurred_at).getTime() >= monthAgo).length
    const linkedTx = linkTransactionsToMood(transactions, moods, annotations).filter((tx) => tx.linkedMood)
    const linked = spendMoments.length + linkedTx.length
    const total = spendMoments.length + transactions.length
    return { moodsThisWeek, spendLast30, linked, total }
  }, [moods, spendMoments, transactions, annotations])

  const unlockedCount = useMemo(
    () => cards.filter((card) => card.confidence.level !== 'Low').length,
    [cards],
  )

  const runAction = async (action: string) => {
    if (action === 'demo') {
      setStatus('Loading demo data...')
      await loadSampleData()
      setStatus('Demo data loaded (not your real data).')
      setLastRefresh(Date.now())
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="section-subtitle">Overview.</p>
        </div>
        <div className="inline-list">
          <span className="pill">Streak {getDailyStreak()}d</span>
          {reflectionDue ? <span className="pill">Reflection due</span> : null}
        </div>
      </div>

      {status ? <p className="helper">{status}</p> : null}

      <div className="grid grid-2">
        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Start here</h2>
            </div>
          </div>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button className="button button-primary" onClick={() => runAction('demo')}>
              Try demo data
            </button>
            <Link to="/today" className="button">
              Start logging
            </Link>
            <Link to="/data" className="button button-muted">
              Import (optional)
            </Link>
          </div>
          <ul className="checklist">
            <li className={hasMoodToday ? 'done' : ''}>Log a mood</li>
            <li className={hasSpendToday ? 'done' : ''}>Log a spend moment</li>
            <li className={hasImport ? 'done' : ''}>Import history (optional)</li>
            <li className="done">View insights</li>
          </ul>
          <p className="helper" style={{ marginTop: 8 }}>
            Unlocked: {unlockedCount} cards
          </p>
          <p className="helper">{supportiveCopy.moodTagging}</p>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Data readiness</h2>
            </div>
          </div>
          <div className="status-grid">
            <div className="status-row">
              <span>Moods this week</span>
              <span className="status-value">{readiness.moodsThisWeek}/7</span>
            </div>
            <div className="status-row">
              <span>Spend last 30 days</span>
              <span className="status-value">{readiness.spendLast30}/30</span>
            </div>
            <div className="status-row">
              <span>Link coverage</span>
              <span className="status-value">
                {readiness.linked}/{readiness.total || 0}
              </span>
            </div>
            <div className="status-row">
              <span>Mood‑tagged purchases</span>
              <span className="status-value">{taggedCount}</span>
            </div>
          </div>
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
            <Link to="/today" className="button">
              Log a moment
            </Link>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Insight cards</h2>
            <p className="section-subtitle">Actionable signals.</p>
          </div>
        </div>
        <div className="card-feed">
          {cards.map((card) => (
            <InsightCard key={card.spec.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}
