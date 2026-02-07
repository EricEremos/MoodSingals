import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'

export function smallFrequentLeaksCard(context: InsightContext): InsightCardResult {
  const moments = context.spendMoments
  const smalls = moments.filter((moment) => moment.amount <= 15)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklySmall = smalls.filter(
    (moment) => new Date(moment.created_at).getTime() >= weekAgo,
  ).length
  const total = moments.length

  const gap =
    total < 12
      ? {
          message: 'Need 12 spend moments to spot small leaks.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/today',
        }
      : undefined

  return {
    id: 'small-frequent-leaks',
    title: 'Small frequent leaks',
    insight:
      total >= 12
        ? `Small spends this week: ${weeklySmall} [estimate].`
        : 'Not enough data yet.',
    data: { total, smalls: smalls.length, weeklySmall },
    vizSpec: {
      type: 'donut',
      labels: ['Under $15', 'Other'],
      values: [smalls.length, Math.max(total - smalls.length, 0)],
    },
    microAction: 'Swap one small leak.',
    confidence: context.confidence,
    howComputed: 'Counts moments under $15.',
    evidence: BASE_EVIDENCE,
    limits: [...BASE_LIMITS, 'Estimate — replace after 30 logs.'],
    relevance: 0.75,
    gap,
  }
}
