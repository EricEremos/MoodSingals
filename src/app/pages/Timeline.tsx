import { useEffect, useMemo, useState } from 'react'
import { db, type MoodLog, type SpendMoment, type Transaction } from '../../data/db'
import { formatLocalDate } from '../../utils/dates'

type TimelineItem =
  | { type: 'Spend'; when: string; amount: number; category: string; mood: string; tags: string[] }
  | { type: 'Mood'; when: string; mood: string; note?: string }
  | { type: 'Transaction'; when: string; amount: number; merchant: string; category: string }

export default function Timeline() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const load = async () => {
      const [spends, moodLogs, tx] = await Promise.all([
        db.spend_moments.orderBy('created_at').reverse().toArray(),
        db.mood_logs.orderBy('occurred_at').reverse().toArray(),
        db.transactions.orderBy('occurred_at').reverse().toArray(),
      ])
      setSpendMoments(spends)
      setMoods(moodLogs)
      setTransactions(tx)
    }
    load()
  }, [])

  const items = useMemo<TimelineItem[]>(() => {
    const spendItems: TimelineItem[] = spendMoments.map((moment) => ({
      type: 'Spend',
      when: moment.created_at,
      amount: moment.amount,
      category: moment.category,
      mood: moment.mood_label,
      tags: moment.tags,
    }))
    const moodItems: TimelineItem[] = moods.map((mood) => ({
      type: 'Mood',
      when: mood.occurred_at,
      mood: mood.mood_label,
      note: mood.note,
    }))
    const txItems: TimelineItem[] = transactions.map((tx) => ({
      type: 'Transaction',
      when: tx.occurred_at,
      amount: tx.outflow > 0 ? -tx.outflow : tx.inflow,
      merchant: tx.merchant,
      category: tx.category,
    }))
    return [...spendItems, ...moodItems, ...txItems].sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    )
  }, [spendMoments, moods, transactions])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Timeline</h1>
          <p className="section-subtitle">All logs in one list.</p>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date</th>
              <th>Details</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 75).map((item, idx) => (
              <tr key={`${item.type}-${item.when}-${idx}`}>
                <td>{item.type}</td>
                <td>{formatLocalDate(item.when)}</td>
                <td>
                  {item.type === 'Spend'
                    ? `${item.category} · ${item.mood}${item.tags.length ? ` · ${item.tags.join(', ')}` : ''}`
                    : item.type === 'Mood'
                      ? `${item.mood}${item.note ? ` · ${item.note}` : ''}`
                      : `${item.merchant} · ${item.category}`}
                </td>
                <td>
                  {item.type === 'Mood'
                    ? '-'
                    : item.amount
                      ? `$${Math.abs(item.amount).toFixed(2)}`
                      : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
