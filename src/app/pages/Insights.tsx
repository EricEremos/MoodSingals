import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import InsightCard from '../../components/InsightCard'
import InfoSheet from '../../components/InfoSheet'
import {
  db,
  type MoodLog,
  type SpendMoment,
  type Transaction,
  type TxMoodAnnotation,
} from '../../data/db'
import { computeInsights, confidenceScore } from '../../data/insights'
import type { IndexResult } from '../../data/indices/types'
import { loadSampleData } from '../../data/sample'
import { copy } from '../../utils/copy'

export default function Insights() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [annotations, setAnnotations] = useState<TxMoodAnnotation[]>([])
  const [cards, setCards] = useState<IndexResult[]>([])
  const [status, setStatus] = useState('')
  const [lastRefresh, setLastRefresh] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [spends, moodLogs, tx, txAnnotations] = await Promise.all([
        db.spend_moments.toArray(),
        db.mood_logs.toArray(),
        db.transactions.toArray(),
        db.tx_mood_annotations.toArray(),
      ])
      setSpendMoments(spends)
      setMoods(moodLogs)
      setTransactions(tx)
      setAnnotations(txAnnotations)
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
    setCards(sorted.slice(0, 8))
  }, [spendMoments, moods, transactions, annotations])

  const readiness = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const moodsThisWeek = moods.filter((entry) => new Date(entry.occurred_at).getTime() >= weekAgo).length
    const spendLast30 =
      spendMoments.filter((entry) => new Date(entry.created_at).getTime() >= monthAgo).length +
      transactions.filter((entry) => new Date(entry.occurred_at).getTime() >= monthAgo).length
    const moodTaggedPurchases = annotations.length
    return {
      moodsThisWeek,
      spendLast30,
      moodTaggedPurchases,
    }
  }, [moods, spendMoments, transactions, annotations])

  const loadDemo = async () => {
    try {
      setStatus('Loading...')
      await loadSampleData()
      setStatus(copy.insights.demoLoaded)
      setLastRefresh(Date.now())
    } catch {
      setStatus(copy.insights.demoFailed)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2 className="page-title">{copy.insights.title}</h2>
        </div>
      </header>

      {status ? <p className="status-text">{status}</p> : null}

      <div className="grid grid-2">
        <section className="card card-elevated">
          <div className="card-header">
            <h3 className="card-title">{copy.insights.startTitle}</h3>
            <InfoSheet title={copy.insights.startInfoTitle}>
              <ul className="sheet-list">
                {copy.insights.startInfoBody.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </InfoSheet>
          </div>
          <div className="inline-list" style={{ marginTop: 16 }}>
            <button className="button button-primary" type="button" onClick={loadDemo}>
              {copy.insights.demoAction}
            </button>
            <Link to="/today" className="button">
              {copy.insights.logAction}
            </Link>
            <Link to="/data" className="button button-muted">
              {copy.insights.importAction}
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3 className="card-title">{copy.insights.readinessTitle}</h3>
            <InfoSheet title={copy.insights.readinessInfoTitle}>
              <ul className="sheet-list">
                {copy.insights.readinessInfoBody.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </InfoSheet>
          </div>
          <div className="metric-list" style={{ marginTop: 16 }}>
            <div className="metric-row">
              <span>{copy.insights.moodsMetric}</span>
              <strong>{readiness.moodsThisWeek}</strong>
            </div>
            <div className="metric-row">
              <span>{copy.insights.spendMetric}</span>
              <strong>{readiness.spendLast30}</strong>
            </div>
            <div className="metric-row">
              <span>{copy.insights.taggedMetric}</span>
              <strong>{readiness.moodTaggedPurchases}</strong>
            </div>
          </div>
        </section>
      </div>

      <section>
        <div className="section-header">
          <div className="section-title">{copy.insights.feedTitle}</div>
        </div>

        {cards.length ? (
          <div className="card-feed">
            {cards.map((card) => (
              <InsightCard key={card.spec.id} card={card} />
            ))}
          </div>
        ) : (
          <div className="empty-state">{copy.insights.emptyCards}</div>
        )}
      </section>
    </div>
  )
}
