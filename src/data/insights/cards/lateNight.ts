import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'
export function lateNightLeakCard(context: InsightContext): InsightCardResult {
  const txWithTime = context.transactions.filter((tx) => !tx.time_unknown)
  const timeMissing = context.transactions.some((tx) => tx.time_unknown)
  const events = [
    ...context.spendMoments.map((moment) => new Date(moment.created_at)),
    ...txWithTime.map((tx) => new Date(tx.occurred_at)),
  ]
  const lateNight = events.filter((date) => {
    const hour = date.getHours()
    return hour >= 22 || hour <= 2
  })
  const total = events.length
  const share = total ? lateNight.length / total : 0

  const gap =
    total < 10
      ? {
        message: 'Need 10 spend moments to spot late-night patterns.',
        ctaLabel: 'Log a spend moment',
          ctaHref: '/today',
        }
      : undefined

  const limits = [...BASE_LIMITS]
  if (timeMissing && txWithTime.length === 0) {
    limits.unshift('Imported transactions missing time.')
  }

  return {
    id: 'late-night-leak',
    title: 'Late-night spending',
    insight:
      total >= 10
        ? `${Math.round(share * 100)}% of spend records happen late night.`
        : timeMissing && !context.spendMoments.length
          ? 'Import is missing time. Log spend moments.'
          : 'Not enough data yet.',
    data: { total, lateNight: lateNight.length },
    vizSpec: {
      type: 'donut',
      labels: ['Late night', 'Other'],
      values: [lateNight.length, Math.max(total - lateNight.length, 0)],
    },
    microAction: 'Pause once before a late‑night spend.',
    confidence: context.confidence,
    howComputed: 'Spend records between 10pm and 2am.',
    evidence: BASE_EVIDENCE,
    limits,
    relevance: 0.8,
    gap,
  }
}
