import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { comfortSpendSpec } from '../../indices/specs/comfortSpend'
import type { Confidence } from '../confidence'
import { directConfidence } from '../confidence'
import { directLinkDetailsNote, moodTagUnlockGap, selectMoodLinkedTransactions } from '../directLinks'

const DISCRETIONARY = new Set(['Dining', 'Shopping', 'Subscriptions', 'Other', 'Entertainment'])

export function comfortSpendingPatternCard(context: InsightContext): IndexResult {
  const selection = selectMoodLinkedTransactions(context)
  const linked = selection.linked
  const lowLinked = linked.filter((tx) => tx.linkedMood && tx.linkedMood.mood_valence <= -1)
  const lowSpendMoments = context.spendMoments.filter((m) => m.valence <= -1)

  const lowDiscretionary = [
    ...lowSpendMoments.filter((m) => DISCRETIONARY.has(m.category)).map((m) => m.amount),
    ...lowLinked.filter((tx) => DISCRETIONARY.has(tx.category)).map((tx) => tx.outflow || 0),
  ]

  const allDiscretionary = [
    ...context.spendMoments.filter((m) => DISCRETIONARY.has(m.category)).map((m) => m.amount),
    ...linked.filter((tx) => DISCRETIONARY.has(tx.category)).map((tx) => tx.outflow || 0),
  ]

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const lowAvg = avg(lowDiscretionary)
  const baseAvg = avg(allDiscretionary)
  const delta = baseAvg ? ((lowAvg - baseAvg) / baseAvg) * 100 : 0

  const totalLow = lowSpendMoments.length + lowLinked.length
  const confidence: Confidence = directConfidence(context.directCount)
  const detailsNote = directLinkDetailsNote(selection.usesInferred)
  const gap =
    moodTagUnlockGap(context.directCount) ||
    (totalLow < 8
      ? { message: 'Need 8 low‑mood moments.', ctaLabel: 'Log a mood', ctaHref: '/today' }
      : undefined)

  if (totalLow < 8 || context.moodLogs.length < 7) {
    confidence.level = 'Low'
    confidence.reasons.push('Need at least 8 low-mood records and 7 mood logs')
  } else if (
    confidence.level === 'High' &&
    (totalLow < 20 || context.moodLogs.length < 14)
  ) {
    confidence.level = 'Med'
    confidence.reasons.push('Need more low-mood coverage for high confidence')
  }

  return {
    spec: comfortSpendSpec,
    insight:
      totalLow >= 8
        ? `Low‑mood discretionary spend is ${delta >= 0 ? '+' : ''}${Math.round(delta)}% vs baseline.`
        : 'Not enough data yet.',
    data: { lowAvg, baseAvg, delta },
    detailsNote,
    vizSpec: {
      type: 'donut',
      labels: ['Low‑mood discretionary', 'Baseline'],
      values: [lowAvg, baseAvg || 1],
    },
    microAction: 'Try a non‑spend comfort option once.',
    confidence,
    relevance: 0.8,
    gap,
  }
}
