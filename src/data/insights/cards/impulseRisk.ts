import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { impulseRiskSpec } from '../../indices/specs/impulseRisk'
import type { Confidence } from '../confidence'
import { directConfidence } from '../confidence'
import { directLinkDetailsNote, moodTagUnlockGap, selectMoodLinkedTransactions } from '../directLinks'

const DISCRETIONARY = new Set(['Dining', 'Shopping', 'Subscriptions', 'Other', 'Entertainment'])

export function impulseMomentsMapCard(context: InsightContext): IndexResult {
  const selection = selectMoodLinkedTransactions(context)
  const linked = selection.linked
  const discretionaryTx = linked.filter((tx) => DISCRETIONARY.has(tx.category))
  const discretionarySpend = discretionaryTx.length

  const riskTx = discretionaryTx.filter((tx) => {
    const mood = tx.linkedMood
    return mood && mood.mood_valence <= -1 && mood.mood_arousal >= 1.5
  })

  const percent = discretionarySpend ? (riskTx.length / discretionarySpend) * 100 : 0

  const confidence: Confidence = directConfidence(context.directCount)
  const detailsNote = directLinkDetailsNote(selection.usesInferred)
  const gap =
    moodTagUnlockGap(context.directCount) ||
    (discretionarySpend < 20
      ? { message: 'Need 20 discretionary spends.', ctaLabel: 'Log a spend moment', ctaHref: '/today' }
      : undefined)

  if (discretionarySpend < 20 || context.moodLogs.length < 7) {
    confidence.level = 'Low'
    confidence.reasons.push('Need at least 20 discretionary linked transactions and 7 mood logs')
  } else if (
    confidence.level === 'High' &&
    (discretionarySpend < 40 || context.moodLogs.length < 14)
  ) {
    confidence.level = 'Med'
    confidence.reasons.push('Need more discretionary coverage for high confidence')
  }

  return {
    spec: impulseRiskSpec,
    insight:
      discretionarySpend >= 20
        ? `${Math.round(percent)}% of discretionary spend happens during low‑mood, high‑energy windows.`
        : 'Not enough data yet.',
    data: { discretionarySpend, riskCount: riskTx.length },
    detailsNote,
    vizSpec: {
      type: 'donut',
      labels: ['Risk window', 'Other'],
      values: [riskTx.length, Math.max(discretionarySpend - riskTx.length, 0)],
    },
    microAction: 'When energy is high and mood is low, try a 60‑second pause.',
    confidence,
    relevance: 0.9,
    gap,
  }
}
