import type { InsightCardResult, InsightContext } from '../index'
import { percent } from '../../../utils/stats'

export function lateNightCard(context: InsightContext): InsightCardResult {
  const withTime = context.transactions.filter((tx) => !tx.time_unknown)
  const lateNight = withTime.filter((tx) => {
    const hour = new Date(tx.occurred_at).getHours()
    return hour >= 22 || hour <= 2
  })

  const totalOutflow = withTime.reduce((acc, tx) => acc + tx.outflow, 0)
  const lateOutflow = lateNight.reduce((acc, tx) => acc + tx.outflow, 0)
  const share = percent(lateOutflow, totalOutflow)

  const insight =
    totalOutflow > 0
      ? `${share.toFixed(1)}% of timed spend lands between 10pm–2am.`
      : 'Not enough timed spend data yet.'

  const confidence =
    context.timeUnknownPct > 0.35
      ? {
          level: 'Low' as const,
          reasons: [...context.confidence.reasons, 'Many transactions lack a time'],
        }
      : context.confidence

  return {
    id: 'late-night',
    title: 'Late-Night Leak (22–02)',
    insight,
    data: { share, lateOutflow },
    vizSpec: {
      type: 'spark',
      values: lateNight.map((tx) => tx.outflow).slice(-12),
    },
    microAction: 'If late-night spend feels impulsive, set a gentle cutoff ritual.',
    confidence,
    howComputed: 'Looks at transactions with known time between 22:00 and 02:00.',
    relevance: Math.min(1, share / 20 + 0.3),
  }
}
