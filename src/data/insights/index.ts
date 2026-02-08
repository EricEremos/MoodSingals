import type { MoodLog, SpendMoment, Transaction, TxMoodAnnotation } from '../db'
import type { IndexResult } from '../indices/types'
import { linkTransactionsToMood } from './linkMood'
import { readinessCard } from './cards/heatmap'
import { topTriggerTagsCard } from './cards/stressTriggers'
import { lateNightLeakCard } from './cards/lateNight'
import { impulseMomentsMapCard } from './cards/impulseRisk'
import { comfortSpendingPatternCard } from './cards/comfortSpend'
import { happyAnchorsCard } from './cards/happyAnchors'
import { moodSpendMapCard } from './cards/moodSpendMap'
import { weeklyDriftCard } from './cards/weekdayDrift'
import { validateIndexStandardV1 } from '../indices/specs'

export type InsightContext = {
  spendMoments: SpendMoment[]
  moodLogs: MoodLog[]
  transactions: Transaction[]
  annotations: TxMoodAnnotation[]
  sampleSize: number
  linkCoverage: number
  linkedCount: number
  directCount: number
  totalSpendRecords: number
  linkedTransactions: ReturnType<typeof linkTransactionsToMood>
  directLinkedTransactions: ReturnType<typeof linkTransactionsToMood>
  inferredLinkedTransactions: ReturnType<typeof linkTransactionsToMood>
  unlinkedTransactions: ReturnType<typeof linkTransactionsToMood>
}

export function computeInsights(
  spendMoments: SpendMoment[],
  moodLogs: MoodLog[],
  transactions: Transaction[],
  annotations: TxMoodAnnotation[] = [],
) {
  validateIndexStandardV1()
  const linkedAll = linkTransactionsToMood(transactions, moodLogs, annotations)
  const linkedTx = linkedAll.filter((tx) => tx.linkedMood)
  const directLinkedTransactions = linkedAll.filter((tx) => tx.linkTier === 'DIRECT' && tx.linkedMood)
  const inferredLinkedTransactions = linkedAll.filter((tx) => tx.linkTier === 'INFERRED' && tx.linkedMood)
  const unlinkedTransactions = linkedAll.filter((tx) => tx.linkTier === 'UNLINKED')
  const totalSpendRecords = spendMoments.length + transactions.length
  const linkedCount = spendMoments.length + linkedTx.length
  const linkCoverage = totalSpendRecords ? linkedCount / totalSpendRecords : 0
  const directCount = annotations.length

  const context: InsightContext = {
    moodLogs,
    spendMoments,
    transactions,
    annotations,
    sampleSize: totalSpendRecords,
    linkCoverage,
    linkedCount,
    directCount,
    totalSpendRecords,
    linkedTransactions: linkedAll,
    directLinkedTransactions,
    inferredLinkedTransactions,
    unlinkedTransactions,
  }

  const cards = [
    moodSpendMapCard,
    impulseMomentsMapCard,
    lateNightLeakCard,
    topTriggerTagsCard,
    comfortSpendingPatternCard,
    happyAnchorsCard,
    weeklyDriftCard,
    readinessCard,
  ]
    .map((fn) => fn(context))
    .filter(Boolean) as IndexResult[]

  return cards
}

export function confidenceScore(level: 'Low' | 'Med' | 'High') {
  if (level === 'High') return 3
  if (level === 'Med') return 2
  return 1
}
