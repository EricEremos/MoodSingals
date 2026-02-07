import { useEffect, useMemo, useState } from 'react'
import { db, type MoodLog, type SpendMoment, type Transaction } from '../../data/db'
import { formatLocalDate } from '../../utils/dates'
import { MOODS, TAGS } from '../../data/insights/moods'

type TimelineItem =
  | { type: 'Spend'; when: string; amount: number; category: string; mood: string; tags: string[] }
  | { type: 'Mood'; when: string; mood: string; note?: string }
  | { type: 'Transaction'; when: string; amount: number; merchant: string; category: string }

export default function Timeline() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState('')
  const [mood, setMood] = useState('')
  const [tag, setTag] = useState('')
  const [urge, setUrge] = useState('')

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
    const all = [...spendItems, ...moodItems, ...txItems]
    const start = startDate ? new Date(startDate).getTime() : 0
    const end = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY

    return all
      .filter((item) => {
        const time = new Date(item.when).getTime()
        if (time < start || time > end) return false
        if (item.type === 'Spend') {
          if (category && item.category !== category) return false
          if (mood && item.mood !== mood) return false
          if (tag && !item.tags.includes(tag)) return false
          if (urge) {
            const moment = spendMoments.find((s) => s.created_at === item.when)
            if (!moment || String(moment.urge_level) !== urge) return false
          }
        }
        if (item.type === 'Mood') {
          if (mood && item.mood !== mood) return false
          if (tag && !(moods.find((m) => m.occurred_at === item.when)?.tags || []).includes(tag))
            return false
        }
        if (item.type === 'Transaction') {
          if (category && item.category !== category) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
  }, [spendMoments, moods, transactions, startDate, endDate, category, mood, tag, urge])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Timeline</h1>
          <p className="section-subtitle">All logs in one list.</p>
        </div>
      </div>

      <div className="card">
        <div className="inline-list" style={{ marginBottom: 12 }}>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Category</option>
            {Array.from(new Set(spendMoments.map((m) => m.category))).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select className="select" value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="">Mood</option>
            {MOODS.map((m) => (
              <option key={m.label} value={m.label}>
                {m.label}
              </option>
            ))}
          </select>
          <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">Tag</option>
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
          <select className="select" value={urge} onChange={(e) => setUrge(e.target.value)}>
            <option value="">Urge</option>
            <option value="0">Low</option>
            <option value="1">Medium</option>
            <option value="2">High</option>
          </select>
        </div>
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
