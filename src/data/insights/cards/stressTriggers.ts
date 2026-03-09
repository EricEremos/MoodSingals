import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { topTriggersSpec } from '../../indices/specs/topTriggers'
import type { Confidence } from '../confidence'
import { directConfidence } from '../confidence'
import { directLinkDetailsNote, moodTagUnlockGap, selectMoodLinkedTransactions } from '../directLinks'

export function topTriggerTagsCard(context: InsightContext): IndexResult {
  const baseCounts: Record<string, number> = {}
  const lowCounts: Record<string, number> = {}
  let baseTotal = 0
  let lowTotal = 0

  context.spendMoments.forEach((moment) => {
    baseCounts[moment.category] = (baseCounts[moment.category] || 0) + 1
    baseTotal += 1
    if (moment.valence <= -1) {
      lowCounts[moment.category] = (lowCounts[moment.category] || 0) + 1
      lowTotal += 1
    }
  })

  const selection = selectMoodLinkedTransactions(context)
  selection.linked.forEach((tx) => {
    baseCounts[tx.category] = (baseCounts[tx.category] || 0) + 1
    baseTotal += 1
    if (tx.linkedMood && tx.linkedMood.mood_valence <= -1) {
      lowCounts[tx.category] = (lowCounts[tx.category] || 0) + 1
      lowTotal += 1
    }
  })

  const lifts = Object.keys(baseCounts).map((category) => {
    const baseShare = baseTotal ? baseCounts[category] / baseTotal : 0
    const lowShare = lowTotal ? (lowCounts[category] || 0) / lowTotal : 0
    const lift = baseShare ? (lowShare / baseShare - 1) * 100 : 0
    return { category, lift }
  })

  const top = lifts.sort((a, b) => b.lift - a.lift).slice(0, 3)
  const labels = top.map((t) => t.category)
  const values = top.map((t) => Math.max(0, Number(t.lift.toFixed(1))))

  const confidence: Confidence = directConfidence(context.directCount)
  const detailsNote = directLinkDetailsNote(selection.usesInferred)
  const gap = moodTagUnlockGap(context.directCount)
  const topSample = top.length > 0 ? (baseCounts[top[0].category] || 0) : 0

  if (baseTotal < 30 || context.moodLogs.length < 7) {
    confidence.level = 'Low'
    confidence.reasons.push('Need at least 30 linked records and 7 mood logs')
  } else if (
    confidence.level === 'High' &&
    (baseTotal < 60 || context.moodLogs.length < 14 || topSample < 10)
  ) {
    confidence.level = 'Med'
    confidence.reasons.push('Need larger trigger samples for high confidence')
  }

  return {
    spec: topTriggersSpec,
    insight:
      labels.length > 0
        ? `Top low‑mood lifts: ${labels.join(', ')}.`
        : 'Not enough data yet.',
    data: { lifts },
    detailsNote,
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['No data'], values: [1] },
    microAction: 'Add a mood log near stressful spending.',
    confidence,
    relevance: 0.85,
    gap,
  }
}
