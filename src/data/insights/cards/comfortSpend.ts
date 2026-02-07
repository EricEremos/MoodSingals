import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS, RETAIL_THERAPY_EVIDENCE } from '../evidence'
export function comfortSpendingPatternCard(context: InsightContext): InsightCardResult {
  const lowMood = new Set(['Sad', 'Tired', 'Anxious', 'Stressed', 'Irritated'])
  const discretionary = new Set(['Dining', 'Shopping', 'Subscriptions', 'Other'])
  const lowMoodSpends = context.spendMoments.filter((moment) => lowMood.has(moment.mood_label))
  const discretionaryCount = lowMoodSpends.filter((moment) =>
    discretionary.has(moment.category),
  ).length

  const total = lowMoodSpends.length
  const gap =
    total < 8
      ? {
          message: 'Need 8 low‑mood moments to spot comfort spending.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/today',
        }
      : undefined

  return {
    id: 'comfort-spending',
    title: 'Comfort spending',
    insight:
      total >= 8
        ? `${discretionaryCount} of ${total} low‑mood spends were discretionary.`
        : 'Not enough data yet.',
    data: { total, discretionaryCount },
    vizSpec: {
      type: 'donut',
      labels: ['Discretionary', 'Other'],
      values: [discretionaryCount, Math.max(total - discretionaryCount, 0)],
    },
    microAction: 'Try a non‑spend comfort option once.',
    confidence: context.confidence,
    howComputed: 'Low‑mood moments followed by discretionary categories.',
    evidence: [...BASE_EVIDENCE, RETAIL_THERAPY_EVIDENCE],
    limits: BASE_LIMITS,
    relevance: 0.8,
    gap,
  }
}
