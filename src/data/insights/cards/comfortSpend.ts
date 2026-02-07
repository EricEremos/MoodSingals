import type { InsightCardResult, InsightContext } from '../index'

export function comfortSpendCard(context: InsightContext): InsightCardResult {
  const lowMood = context.linked.filter(
    (tx) => tx.linkedMood && tx.linkedMood.mood_valence < -0.4,
  )
  const totals = lowMood.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.outflow
    return acc
  }, {})
  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return {
    id: 'comfort-spend',
    title: 'Comfort Spend After Low Mood',
    insight:
      top.length > 0
        ? `Comfort spend leans toward ${top.map(([cat]) => cat).join(', ')}.`
        : 'No comfort-spend pattern yet.',
    data: { top },
    vizSpec: { type: 'bar', labels: top.map(([cat]) => cat), values: top.map(([, v]) => v) },
    microAction: 'Prepare a non-spend comfort option for low-mood moments.',
    confidence: context.confidence,
    howComputed: 'Aggregates spend linked to moods with low valence.',
    relevance: top.length ? 0.6 : 0.3,
  }
}
