import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'

export function dataGapMirrorCard(context: InsightContext): InsightCardResult {
  const spendCount = context.spendMoments.length
  const moodCount = context.moodLogs.length
  const missingSpend = Math.max(10 - spendCount, 0)
  const missingMood = Math.max(5 - moodCount, 0)

  const nextGap =
    missingSpend > 0
      ? `Add ${missingSpend} spend moments`
      : missingMood > 0
        ? `Add ${missingMood} mood check-ins`
        : 'Coverage is solid'

  return {
    id: 'data-gap-mirror',
    title: 'Data gaps',
    insight: nextGap,
    data: { spendCount, moodCount },
    vizSpec: {
      type: 'bar',
      labels: ['Spend moments', 'Mood logs'],
      values: [spendCount, moodCount],
    },
    microAction: 'Log one more today.',
    confidence: context.confidence,
    howComputed: 'Compares counts to a baseline.',
    evidence: BASE_EVIDENCE,
    limits: BASE_LIMITS,
    relevance: 0.6,
    gap: {
      message:
        missingSpend > 0
          ? `Need ${missingSpend} more spend moments to reach baseline.`
          : missingMood > 0
            ? `Need ${missingMood} more mood check-ins to reach baseline.`
            : 'You have baseline coverage. Keep logging to maintain it.',
      ctaLabel: missingSpend > 0 ? 'Log a spend moment' : 'Log a mood',
      ctaHref: '/today',
    },
  }
}
