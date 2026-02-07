import type { InsightCardResult, InsightContext } from '../index'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayDriftCard(context: InsightContext): InsightCardResult {
  const totals = context.transactions.reduce<Record<string, number>>((acc, tx) => {
    const day = WEEKDAYS[new Date(tx.occurred_at).getDay()]
    acc[day] = (acc[day] || 0) + tx.outflow
    return acc
  }, {})

  const values = WEEKDAYS.map((day) => totals[day] || 0)
  const maxIndex = values.indexOf(Math.max(...values))

  return {
    id: 'weekday-drift',
    title: 'Weekday Drift',
    insight:
      context.transactions.length > 0
        ? `Highest outflow tends to land on ${WEEKDAYS[maxIndex]}.`
        : 'No weekday pattern yet.',
    data: { totals },
    vizSpec: { type: 'bar', labels: WEEKDAYS, values },
    microAction: 'Add a mid-week checkpoint if that day feels leaky.',
    confidence: context.confidence,
    howComputed: 'Totals outflow by day of week across all transactions.',
    relevance: context.transactions.length ? 0.5 : 0.3,
  }
}
