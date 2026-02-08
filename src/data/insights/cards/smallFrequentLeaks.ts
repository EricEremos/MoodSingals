import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { smallFrequentLeaksSpec } from '../../indices/specs/smallFrequentLeaks'
import { directConfidence } from '../confidence'

export function smallFrequentLeaksCard(context: InsightContext): IndexResult {
  const moments = context.spendMoments
  const tx = context.transactions
  const smallMoments = moments.filter((m) => m.amount <= 15)
  const smallTx = tx.filter((t) => t.outflow > 0 && t.outflow <= 15)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklySmall =
    smallMoments.filter((m) => new Date(m.created_at).getTime() >= weekAgo).length +
    smallTx.filter((t) => new Date(t.occurred_at).getTime() >= weekAgo).length
  const total = moments.length + tx.length

  const confidence = directConfidence(context.directCount)
  if (total < 12) confidence.reasons.push('Need 12 spend records')

  return {
    spec: smallFrequentLeaksSpec,
    insight:
      total >= 12
        ? `Small spends this week: ${weeklySmall} [estimate].`
        : 'Not enough data yet.',
    data: { weeklySmall, total },
    detailsNote: 'Uses transactions and spend moments.',
    vizSpec: {
      type: 'donut',
      labels: ['≤ $15', 'Other'],
      values: [smallMoments.length + smallTx.length, Math.max(total - (smallMoments.length + smallTx.length), 0)],
    },
    microAction: 'Swap one small leak.',
    confidence,
    relevance: 0.7,
    gap:
      total < 12
        ? { message: 'Need 12 spend records.', ctaLabel: 'Log a spend moment', ctaHref: '/today' }
        : undefined,
  }
}
