import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { impulseRiskSpec } from '../../indices/specs/impulseRisk'
import { directConfidence } from '../confidence'

const DISCRETIONARY = new Set(['Dining', 'Shopping', 'Subscriptions', 'Other', 'Entertainment'])

export function impulseMomentsMapCard(context: InsightContext): IndexResult {
  const linked = context.linkedTransactions.filter((tx) => tx.linkedMood)
  const discretionaryTx = linked.filter((tx) => DISCRETIONARY.has(tx.category))
  const discretionarySpend = discretionaryTx.length

  const riskTx = discretionaryTx.filter((tx) => {
    const mood = tx.linkedMood
    return mood && mood.mood_valence <= -1 && mood.mood_arousal >= 1.5
  })

  const percent = discretionarySpend ? (riskTx.length / discretionarySpend) * 100 : 0

  const confidence = directConfidence(context.directCount)
  const detailsNote =
    context.directCount >= 10
      ? 'Using direct mood tags.'
      : 'Using inferred links (time window).'
  const gap =
    context.directCount < 10
      ? { message: 'Tag 10 purchases to unlock this insight.', ctaLabel: 'Tag purchases', ctaHref: '/timeline' }
      : discretionarySpend < 20
        ? { message: 'Need 20 discretionary spends.', ctaLabel: 'Log a spend moment', ctaHref: '/today' }
        : undefined

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
