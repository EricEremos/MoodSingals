import type { InsightCardResult, InsightContext } from '../index'

const STRESS_MOODS = new Set(['Stressed', 'Anxious', 'Irritated'])

export function stressTriggersCard(context: InsightContext): InsightCardResult {
  const stressed = context.linked.filter(
    (tx) => tx.linkedMood && STRESS_MOODS.has(tx.linkedMood.mood_label),
  )

  if (!stressed.length) {
    return {
      id: 'stress-triggers',
      title: 'Stress Trigger Categories',
      insight: 'No stress-linked spend yet. Keep logging moods to surface triggers.',
      data: {},
      vizSpec: { type: 'bar', labels: [], values: [] },
      microAction: 'When stress hits, try a 60-second pause before checkout.',
      confidence: { level: 'Low', reasons: ['Not enough stress-linked transactions'] },
      howComputed: 'Looks at categories linked to high-stress moods.',
      relevance: 0.4,
    }
  }

  const totals = stressed.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.outflow
    return acc
  }, {})

  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return {
    id: 'stress-triggers',
    title: 'Stress Trigger Categories',
    insight: `Stress-linked spend clusters in ${top.map(([cat]) => cat).join(', ')}.`,
    data: { top },
    vizSpec: { type: 'bar', labels: top.map(([cat]) => cat), values: top.map(([, value]) => value) },
    microAction: 'Plan a calming alternative for your top stress category.',
    confidence: context.confidence,
    howComputed: 'Totals spend by category for moods tagged as stressed/anxious/irritated.',
    relevance: 0.7,
  }
}
