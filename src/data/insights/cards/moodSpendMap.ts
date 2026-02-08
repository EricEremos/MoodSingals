import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { moodSpendHeatmapSpec } from '../../indices/specs/moodSpendHeatmap'
import type { Confidence } from '../confidence'
import { directConfidence } from '../confidence'
import { directLinkDetailsNote, moodTagUnlockGap, selectMoodLinkedTransactions } from '../directLinks'

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

  const selection = selectMoodLinkedTransactions(context)
  selection.linked.forEach((tx) => {
    if (!tx.linkedMood) return
    const amount = tx.outflow > 0 ? tx.outflow : 0
    push(tx.linkedMood.mood_valence, tx.linkedMood.mood_arousal, amount)
  })

  const values = totals.map((row, aIdx) =>
    row.map((sum, vIdx) => (counts[aIdx][vIdx] ? sum / counts[aIdx][vIdx] : 0)),
  )

  const confidence: Confidence = directConfidence(context.directCount)
  const linkedCount = context.spendMoments.length + selection.linked.length
  const detailsNote = directLinkDetailsNote(selection.usesInferred)
  const gap = moodTagUnlockGap(context.directCount)
  const moodCount = context.moodLogs.length

  if (linkedCount < 30 || moodCount < 7) {
    confidence.level = 'Low'
    confidence.reasons.push('Need at least 30 linked spend records and 7 mood logs')
  } else if (
    confidence.level === 'High' &&
    (linkedCount < 60 || moodCount < 14 || context.linkCoverage < 0.6)
  ) {
    confidence.level = 'Med'
    confidence.reasons.push('More linked coverage needed for high confidence')
  }

  return {
    spec: moodSpendHeatmapSpec,
    insight: linkedCount
      ? 'Average spend by mood and energy.'
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
