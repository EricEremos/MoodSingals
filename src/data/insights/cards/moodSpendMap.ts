import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { moodSpendHeatmapSpec } from '../../indices/specs/moodSpendHeatmap'
import { directConfidence } from '../confidence'

export function moodSpendMapCard(context: InsightContext): IndexResult {
  const valenceBins = [-2, -1, 0, 1, 2]
  const arousalBins = [0, 1, 2]
  const totals = arousalBins.map(() => valenceBins.map(() => 0))
  const counts = arousalBins.map(() => valenceBins.map(() => 0))

  const push = (valence: number, arousal: number, amount: number) => {
    const vIdx = valenceBins.indexOf(Math.round(valence))
    const aIdx = arousalBins.indexOf(Math.round(arousal))
    if (vIdx >= 0 && aIdx >= 0) {
      totals[aIdx][vIdx] += amount
      counts[aIdx][vIdx] += 1
    }
  }

  context.spendMoments.forEach((moment) => {
    push(moment.valence, moment.arousal, moment.amount)
  })

  context.linkedTransactions.forEach((tx) => {
    if (!tx.linkedMood) return
    const amount = tx.outflow > 0 ? tx.outflow : 0
    push(tx.linkedMood.mood_valence, tx.linkedMood.mood_arousal, amount)
  })

  const values = totals.map((row, aIdx) =>
    row.map((sum, vIdx) => (counts[aIdx][vIdx] ? sum / counts[aIdx][vIdx] : 0)),
  )

  const confidence = directConfidence(context.directCount)
  const linkedCount = context.linkedCount
  const detailsNote =
    context.directCount >= 10
      ? 'Using direct mood tags.'
      : 'Using inferred links (time window).'
  const gap =
    context.directCount < 10
      ? { message: 'Tag 10 purchases to unlock this insight.', ctaLabel: 'Tag purchases', ctaHref: '/timeline' }
      : undefined

  return {
    spec: moodSpendHeatmapSpec,
    insight: linkedCount
      ? 'Average spend by mood (valence × arousal).'
      : 'Log spend moments to build the map.',
    detailsNote,
    data: { values, counts },
    vizSpec: {
      type: 'heatmap',
      xLabels: ['-2', '-1', '0', '1', '2'],
      yLabels: ['0', '1', '2'],
      values,
    },
    microAction: 'Log one spend moment after a mood.',
    confidence,
    relevance: 0.95,
    gap,
  }
}
