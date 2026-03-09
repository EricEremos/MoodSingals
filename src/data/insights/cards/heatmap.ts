import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { readinessSpec } from '../../indices/specs/readiness'
import { directConfidence } from '../confidence'

export function readinessCard(context: InsightContext): IndexResult {
  const spendCount = context.totalSpendRecords
  const moodCount = context.moodLogs.length
  const taggedCount = context.directLinkedTransactions.length
  const inferredCount = context.inferredLinkedTransactions.length
  const unlinkedCount = context.unlinkedTransactions.length

  const missingSpend = Math.max(20 - spendCount, 0)
  const missingMood = Math.max(7 - moodCount, 0)
  const missingTagged = Math.max(10 - taggedCount, 0)

  const nextGap =
    missingTagged > 0
      ? `Tag ${missingTagged} purchases`
      : missingSpend > 0
        ? `Add ${missingSpend} spend records`
        : missingMood > 0
          ? `Add ${missingMood} mood check-ins`
          : 'Coverage is solid'

  return {
    spec: readinessSpec,
    insight: nextGap,
    data: { spendCount, moodCount, taggedCount, inferredCount, unlinkedCount },
    detailsNote: 'Counts DIRECT, INFERRED, and UNLINKED records for data readiness.',
    vizSpec: {
      type: 'bar',
      labels: ['Spend records', 'Mood logs', 'DIRECT tags'],
      values: [spendCount, moodCount, taggedCount],
    },
    microAction: 'Tag 5 purchases to boost confidence.',
    confidence: directConfidence(context.directCount),
    relevance: 0.7,
    gap: {
      message:
        missingTagged > 0
          ? `Tag ${missingTagged} purchases to improve confidence.`
          : missingSpend > 0
            ? `Add ${missingSpend} spend records to improve coverage.`
            : missingMood > 0
              ? `Add ${missingMood} mood check-ins to improve coverage.`
              : 'You have baseline coverage. Keep logging to maintain it.',
      ctaLabel:
        missingTagged > 0
          ? 'Tag purchases'
          : missingSpend > 0
            ? 'Log a spend moment'
            : 'Log a mood',
      ctaHref: missingTagged > 0 ? '/timeline' : '/today',
    },
  }
}
