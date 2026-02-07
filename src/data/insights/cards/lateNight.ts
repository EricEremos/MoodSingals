import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { lateNightSpec } from '../../indices/specs/lateNight'
import { directConfidence } from '../confidence'

export function lateNightLeakCard(context: InsightContext): IndexResult {
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

  const confidence = directConfidence(context.directCount)
  if (total < 30) confidence.reasons.push('Need 30 timestamped records')

  return {
    spec: lateNightSpec,
    insight:
      total >= 30
        ? `${Math.round(share * 100)}% of spend records happen late night.`
        : timeMissing && !context.spendMoments.length
          ? 'Import is missing time. Log spend moments.'
          : 'Not enough data yet.',
    data: { total, lateNight: lateNight.length },
    detailsNote: 'Uses timestamps only.',
    vizSpec: {
      type: 'donut',
      labels: ['Late night', 'Other'],
      values: [lateNight.length, Math.max(total - lateNight.length, 0)],
    },
    microAction: 'Pause once before a late‑night spend.',
    confidence,
    relevance: 0.8,
    gap:
      total < 30
        ? { message: 'Need 30 timestamped records.', ctaLabel: 'Log a spend moment', ctaHref: '/today' }
        : undefined,
  }
}
