import { useEffect, useState } from 'react'
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

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Insights</h1>
          <p className="section-subtitle">
            Confidence-weighted signals connecting mood, spend, and outcomes.
          </p>
        </div>
        <div className="tag">Local-first</div>
      </div>

      <CSVWizard onImported={() => setLastRefresh(Date.now())} />
      <MoodCheckin onSaved={() => setLastRefresh(Date.now())} />

      <div style={{ marginTop: 24 }}>
        <p className="helper">{supportiveCopy.privacyDisclaimer}</p>
        {computeMs ? <p className="helper">Insight compute: {computeMs}ms</p> : null}
      </div>

      <div style={{ marginTop: 24 }} className="card-feed">
        {cards.map((card) => (
          <InsightCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
