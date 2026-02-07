import type { InsightCardResult, InsightContext } from '../index'

export function dataGapMirrorCard(context: InsightContext): InsightCardResult {
  const spendCount = context.spendMoments.length
  const moodCount = context.moodLogs.length
  const missingSpend = Math.max(10 - spendCount, 0)
  const missingMood = Math.max(5 - moodCount, 0)

  const nextGap =
    missingSpend > 0
      ? `Add ${missingSpend} more spend moments`
      : missingMood > 0
        ? `Add ${missingMood} more mood check-ins`
        : 'Coverage is solid'

  return {
    id: 'data-gap-mirror',
    title: 'Data Gap Mirror',
    insight: nextGap,
    data: { spendCount, moodCount },
    vizSpec: {
      type: 'bar',
      labels: ['Spend moments', 'Mood logs'],
      values: [spendCount, moodCount],
    },
    microAction: 'Log one more moment today to keep the loop alive.',
    confidence: {
      level: missingSpend || missingMood ? 'Low' : 'Med',
      reasons: [
        missingSpend ? `${missingSpend} spend moments missing` : 'Spend coverage ok',
        missingMood ? `${missingMood} moods missing` : 'Mood coverage ok',
      ],
    },
    howComputed: 'Compares logged spend moments and mood check-ins to minimum coverage.',
    relevance: 0.6,
    gap: {
      message:
        missingSpend > 0
          ? `Need ${missingSpend} more spend moments to reach baseline coverage.`
          : missingMood > 0
            ? `Need ${missingMood} more mood check-ins to reach baseline coverage.`
            : 'You have baseline coverage. Keep logging to maintain it.',
      ctaLabel: missingSpend > 0 ? 'Log a spend moment' : 'Log a mood',
      ctaHref: missingSpend > 0 ? '/log' : '/log',
    },
  }
}
