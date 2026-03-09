import { useEffect, useMemo, useState } from 'react'
import {
  db,
  type MoodLog,
  type SpendMoment,
  type Transaction,
  type TxMoodAnnotation,
} from '../../data/db'
import { formatLocalDate } from '../../utils/dates'
import { MOODS, TAGS } from '../../data/insights/moods'
import MoodAttachModal from '../../components/TransactionMood/MoodAttachModal'
import BatchTagFlow from '../../components/TransactionMood/BatchTagFlow'
import MoodPill from '../../components/TransactionMood/MoodPill'
import InfoSheet from '../../components/InfoSheet'
import { Button, Card, CardHeader, EmptyState } from '../../components/ui'
import { copy } from '../../utils/copy'

type TimelineType = 'Mood' | 'Spend' | 'Transaction'

type TimelineItem = {
  id: string
  type: TimelineType
  when: string
  title: string
  subtitle: string
  category?: string
  amount?: number
  moodLabel?: string
  tags?: string[]
  transactionId?: string
}

export default function Timeline() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [annotations, setAnnotations] = useState<TxMoodAnnotation[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TimelineType>('all')
  const [category, setCategory] = useState('')
  const [mood, setMood] = useState('')
  const [tag, setTag] = useState('')
  const [activeTx, setActiveTx] = useState<Transaction | null>(null)
  const [showBatch, setShowBatch] = useState(false)

  const refresh = async () => {
    const [spends, moodLogs, tx, ann] = await Promise.all([
      db.spend_moments.orderBy('created_at').reverse().toArray(),
      db.mood_logs.orderBy('occurred_at').reverse().toArray(),
      db.transactions.orderBy('occurred_at').reverse().toArray(),
      db.tx_mood_annotations.toArray(),
    ])
    setSpendMoments(spends)
    setMoods(moodLogs)
    setTransactions(tx)
    setAnnotations(ann)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const annotationLookup = useMemo(() => {
    const map: Record<string, TxMoodAnnotation> = {}
    for (const ann of annotations) {
      map[ann.transaction_id] = ann
    }
    return map
  }, [annotations])

  const categories = useMemo(() => {
    const values = new Set<string>()
    for (const spend of spendMoments) values.add(spend.category)
    for (const tx of transactions) values.add(tx.category)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [spendMoments, transactions])

  const items = useMemo<TimelineItem[]>(() => {
    const moodItems: TimelineItem[] = moods.map((entry) => ({
      id: `mood-${entry.id}`,
      type: 'Mood',
      when: entry.occurred_at,
      title: `${entry.mood_emoji} ${entry.mood_label}`,
      subtitle: entry.note || 'Mood check-in',
      moodLabel: entry.mood_label,
      tags: entry.tags,
    }))

    const spendItems: TimelineItem[] = spendMoments.map((entry) => ({
      id: `spend-${entry.id}`,
      type: 'Spend',
      when: entry.created_at,
      title: entry.category,
      subtitle: entry.note || `Urge ${entry.urge_level + 1}/3`,
      category: entry.category,
      amount: -Math.abs(entry.amount),
      moodLabel: entry.mood_label,
      tags: entry.tags,
    }))

    const transactionItems: TimelineItem[] = transactions.map((entry) => {
      const annotation = annotationLookup[entry.id]
      const amount = entry.outflow > 0 ? -entry.outflow : entry.inflow
      return {
        id: `tx-${entry.id}`,
        type: 'Transaction',
        when: entry.occurred_at,
        title: entry.merchant || entry.description || 'Transaction',
        subtitle: entry.category,
        category: entry.category,
        amount,
        moodLabel: annotation?.mood_label,
        tags: annotation?.tags,
        transactionId: entry.id,
      }
    })

    const all = [...moodItems, ...spendItems, ...transactionItems]
    const start = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY
    const end = endDate ? new Date(endDate).getTime() + 86_399_000 : Number.POSITIVE_INFINITY

    return all
      .filter((item) => {
        const timestamp = new Date(item.when).getTime()
        if (timestamp < start || timestamp > end) return false
        if (typeFilter !== 'all' && item.type !== typeFilter) return false
        if (category && item.category !== category) return false
        if (mood && item.moodLabel !== mood) return false
        if (tag && !(item.tags || []).includes(tag)) return false
        return true
      })
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
  }, [moods, spendMoments, transactions, annotationLookup, startDate, endDate, typeFilter, category, mood, tag])

  const untaggedTransactions = useMemo(
    () => transactions.filter((tx) => !annotationLookup[tx.id]),
    [transactions, annotationLookup],
  )

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setTypeFilter('all')
    setCategory('')
    setMood('')
    setTag('')
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.timeline.title}</h2>
        </div>
        <div className="inline-list">
          <InfoSheet title={copy.timeline.listInfoTitle}>
            <ul className="sheet-list">
              {copy.timeline.listInfoBody.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </InfoSheet>
          <Button variant="primary" type="button" onClick={() => setShowFilters(true)}>
            {copy.timeline.filterAction}
          </Button>
        </div>
      </div>

      {untaggedTransactions.length ? (
        <Card elevated>
          <Button variant="primary" type="button" onClick={() => setShowBatch(true)}>
            {copy.timeline.tagAction}
          </Button>
        </Card>
      ) : null}

      {items.length ? (
        <div className="timeline-list">
          {items.slice(0, 120).map((item) => (
            <Card key={item.id} className="timeline-item">
              <div className="timeline-meta">
                <span className="tag">{item.type}</span>
                <span className="body-subtle">{formatLocalDate(item.when)}</span>
              </div>
              <div className="timeline-main">
                <h3 className="card-title">{item.title}</h3>
                <p className="body-subtle">{item.subtitle}</p>
                {item.moodLabel ? <MoodPill label={item.moodLabel} tags={item.tags} /> : null}
              </div>
              <div className="timeline-actions">
                {item.transactionId ? (
                  <Button
                    variant={annotationLookup[item.transactionId] ? 'secondary' : 'ghost'}
                    type="button"
                    onClick={() => {
                      const selected = transactions.find((tx) => tx.id === item.transactionId)
                      if (selected) setActiveTx(selected)
                    }}
                  >
                    {annotationLookup[item.transactionId] ? 'Edit mood' : '+ Mood'}
                  </Button>
                ) : null}
                {item.amount !== undefined ? (
                  <strong className="amount-value">
                    {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
                  </strong>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title={copy.timeline.emptyTitle} description={copy.timeline.emptySubtitle} />
      )}

      {showFilters ? (
        <div className="sheet-backdrop" onClick={() => setShowFilters(false)}>
          <section className="info-sheet filter-sheet" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="info-sheet-header">
              <h3 className="card-title">{copy.timeline.filterTitle}</h3>
              <Button variant="ghost" type="button" onClick={() => setShowFilters(false)}>
                Close
              </Button>
            </CardHeader>
            <div className="filter-grid">
              <label className="field-block">
                <span className="section-label">From</span>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="section-label">To</span>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
              <label className="field-block">
                <span className="section-label">Type</span>
                <select
                  className="select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'all' | TimelineType)}
                >
                  <option value="all">{copy.timeline.typeAll}</option>
                  <option value="Mood">{copy.timeline.typeMood}</option>
                  <option value="Spend">{copy.timeline.typeSpend}</option>
                  <option value="Transaction">{copy.timeline.typeTransaction}</option>
                </select>
              </label>
              <label className="field-block">
                <span className="section-label">Category</span>
                <select
                  className="select"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">All</option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span className="section-label">Mood</span>
                <select className="select" value={mood} onChange={(event) => setMood(event.target.value)}>
                  <option value="">All</option>
                  {MOODS.map((value) => (
                    <option key={value.label} value={value.label}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-block">
                <span className="section-label">Tag</span>
                <select className="select" value={tag} onChange={(event) => setTag(event.target.value)}>
                  <option value="">All</option>
                  {TAGS.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="inline-list" style={{ marginTop: 16 }}>
              <Button variant="ghost" type="button" onClick={resetFilters}>
                {copy.timeline.resetFilters}
              </Button>
              <Button variant="primary" type="button" onClick={() => setShowFilters(false)}>
                Apply
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {activeTx ? (
        <MoodAttachModal
          transaction={activeTx}
          existing={annotationLookup[activeTx.id]}
          onClose={() => setActiveTx(null)}
          onSaved={async () => {
            await refresh()
            setActiveTx(null)
          }}
        />
      ) : null}

      {showBatch ? (
        <BatchTagFlow
          transactions={transactions}
          existing={annotationLookup}
          onClose={() => setShowBatch(false)}
          onDone={async () => {
            await refresh()
            setShowBatch(false)
          }}
        />
      ) : null}
    </div>
  )
}
