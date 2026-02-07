import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function lateNightLeakCard(context: InsightContext): InsightCardResult {
  const moments = context.spendMoments
  const lateNight = moments.filter((moment) => {
    const hour = new Date(moment.created_at).getHours()
    return hour >= 22 || hour <= 5
  })
  const total = moments.length
  const share = total ? lateNight.length / total : 0

  const confidence = confidenceFromCount({
    count: total,
    minMed: 10,
    minHigh: 30,
    reasonLabel: 'spend moments',
  })

  const gap =
    total < 10
      ? {
          message: 'Need 10 spend moments to spot late-night patterns.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'late-night-leak',
    title: 'Late-night spending',
    insight:
      total >= 10
        ? `${Math.round(share * 100)}% of spend moments happen late night.`
        : 'Not enough data yet.',
    data: { total, lateNight: lateNight.length },
    vizSpec: {
      type: 'donut',
      labels: ['Late night', 'Other'],
      values: [lateNight.length, Math.max(total - lateNight.length, 0)],
    },
    microAction: 'Pause once before a late-night spend.',
    confidence,
    howComputed: 'Spend moments logged between 10pm and 5am.',
    relevance: 0.8,
    gap,
  }
}
