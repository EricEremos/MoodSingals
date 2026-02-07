import type { InsightCardResult, InsightContext } from '../index'
import { MOODS } from '../moods'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'

export function moodSpendMapCard(context: InsightContext): InsightCardResult {
  const labels = MOODS.map((m) => m.label)
  const totals = labels.map(() => 0)
  const counts = labels.map(() => 0)

  context.spendMoments.forEach((moment) => {
    const idx = labels.indexOf(moment.mood_label)
    if (idx >= 0) {
      totals[idx] += moment.amount
      counts[idx] += 1
    }
  })

  const values = totals.map((sum, idx) => (counts[idx] ? sum / counts[idx] : 0))
  const rows = values.map((v) => [Number(v.toFixed(2))])

  return {
    id: 'mood-spend-map',
    title: 'Mood → spending map',
    insight: context.spendMoments.length
      ? 'Average spend by mood.'
      : 'Log spend moments to build the map.',
    data: { values },
    vizSpec: { type: 'heatmap', xLabels: ['Avg'], yLabels: labels, values: rows },
    microAction: 'Log one spend moment after a mood check‑in.',
    confidence: context.confidence,
    howComputed: 'Average spend amount per mood label.',
    evidence: BASE_EVIDENCE,
    limits: BASE_LIMITS,
    relevance: 0.9,
  }
}
