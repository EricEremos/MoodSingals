import type { InsightCardResult, InsightContext } from '../index'
import { groupBy } from '../../../utils/stats'

export function heatmapCard(context: InsightContext): InsightCardResult {
  if (!context.linked.length || !context.moodLogs.length) {
    return {
      id: 'heatmap',
      title: 'Mood → Spend Heatmap',
      insight: 'Import transactions and log moods to unlock the heatmap.',
      data: {},
      vizSpec: { type: 'heatmap', xLabels: [], yLabels: [], values: [] },
      microAction: 'Try a quick mood check-in before your next purchase.',
      confidence: { level: 'Low', reasons: ['No linked transactions yet'] },
      howComputed: 'This compares linked moods with spend across top categories.',
      relevance: 0.2,
    }
  }

  const linked = context.linked.filter((tx) => tx.linkedMood)
  const categories = Object.entries(
    groupBy(linked, (tx) => tx.category || 'Uncategorized'),
  )
    .sort((a, b) =>
      b[1].reduce((acc, tx) => acc + tx.outflow, 0) -
      a[1].reduce((acc, tx) => acc + tx.outflow, 0),
    )
    .slice(0, 5)
    .map(([category]) => category)

  const moods = Array.from(
    new Set(linked.map((tx) => tx.linkedMood?.mood_label || 'Unknown')),
  )

  const values = categories.map((category) =>
    moods.map((mood) =>
      linked
        .filter((tx) => tx.category === category && tx.linkedMood?.mood_label === mood)
        .reduce((acc, tx) => acc + tx.outflow, 0),
    ),
  )

  return {
    id: 'heatmap',
    title: 'Mood → Spend Heatmap',
    insight: 'Spend intensity shifts by mood and category. Look for bright pockets.',
    data: { categories, moods },
    vizSpec: { type: 'heatmap', xLabels: moods, yLabels: categories, values },
    microAction: 'Pick one bright cell and add a tiny pause before that mood-category combo.',
    confidence: context.confidence,
    howComputed: 'Linked spends are grouped by mood and top five categories, then summed.',
    relevance: 0.8,
  }
}
