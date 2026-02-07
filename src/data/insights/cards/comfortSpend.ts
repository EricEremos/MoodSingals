import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function smallFrequentLeaksCard(context: InsightContext): InsightCardResult {
  const moments = context.spendMoments
  const smalls = moments.filter((moment) => moment.amount <= 15)
  const total = moments.length

  const confidence = confidenceFromCount({
    count: total,
    minMed: 12,
    minHigh: 30,
    reasonLabel: 'spend moments',
  })

  const gap =
    total < 12
      ? {
          message: 'Need 12 spend moments to spot small leaks.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'small-frequent-leaks',
    title: 'Small frequent leaks',
    insight:
      total >= 12
        ? `${smalls.length} of ${total} moments are under $15.`
        : 'Not enough data yet.',
    data: { total, smalls: smalls.length },
    vizSpec: {
      type: 'donut',
      labels: ['Under $15', 'Other'],
      values: [smalls.length, Math.max(total - smalls.length, 0)],
    },
    microAction: 'Swap one small leak.',
    confidence,
    howComputed: 'Counts moments under $15.',
    relevance: 0.75,
    gap,
  }
}
