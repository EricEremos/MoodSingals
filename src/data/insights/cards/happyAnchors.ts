import type { InsightCardResult, InsightContext } from '../index'

export function happyAnchorsCard(context: InsightContext): InsightCardResult {
  const happy = context.linked.filter(
    (tx) => tx.linkedMood && tx.linkedMood.mood_valence > 0.5,
  )
  const totals = happy.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.merchant] = (acc[tx.merchant] || 0) + tx.outflow
    return acc
  }, {})
  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return {
    id: 'happy-anchors',
    title: 'Happy Spend Anchors',
    insight:
      top.length > 0
        ? `Positive moods cluster around ${top.map(([m]) => m).join(', ')}.`
        : 'No happy anchors detected yet.',
    data: { top },
    vizSpec: { type: 'bar', labels: top.map(([m]) => m), values: top.map(([, v]) => v) },
    microAction: 'Lean into anchor spends that feel uplifting and planned.',
    confidence: context.confidence,
    howComputed: 'Totals spend linked to moods with high valence.',
    relevance: top.length ? 0.55 : 0.3,
  }
}
