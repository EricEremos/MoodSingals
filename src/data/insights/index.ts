import type { MoodLog, SpendMoment, Transaction, TxMoodAnnotation } from '../db'
import type { IndexResult, IndexSpec } from '../indices/types'
import { validateIndexSpec } from '../indices/types'
import { linkTransactionsToMood } from './linkMood'
import { readinessCard } from './cards/heatmap'
import { topTriggerTagsCard } from './cards/stressTriggers'
import { lateNightLeakCard } from './cards/lateNight'
import { impulseMomentsMapCard } from './cards/impulseRisk'
import { comfortSpendingPatternCard } from './cards/comfortSpend'
import { happyAnchorsCard } from './cards/happyAnchors'
import { moodSpendMapCard } from './cards/moodSpendMap'
import { weeklyDriftCard } from './cards/weekdayDrift'
import { moodSpendHeatmapSpec } from '../indices/specs/moodSpendHeatmap'
import { impulseRiskSpec } from '../indices/specs/impulseRisk'
import { lateNightSpec } from '../indices/specs/lateNight'
import { topTriggersSpec } from '../indices/specs/topTriggers'
import { comfortSpendSpec } from '../indices/specs/comfortSpend'
import { worthItAnchorsSpec } from '../indices/specs/worthItAnchors'
import { weeklyDriftSpec } from '../indices/specs/weeklyDrift'
import { readinessSpec } from '../indices/specs/readiness'

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
}

export function computeInsights(
  spendMoments: SpendMoment[],
  moodLogs: MoodLog[],
  transactions: Transaction[],
  annotations: TxMoodAnnotation[] = [],
) {
  const linkedAll = linkTransactionsToMood(transactions, moodLogs, annotations)
  const linkedTx = linkedAll.filter((tx) => tx.linkedMood)
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
  }

  const specs: IndexSpec[] = [
    moodSpendHeatmapSpec,
    impulseRiskSpec,
    lateNightSpec,
    topTriggersSpec,
    comfortSpendSpec,
    worthItAnchorsSpec,
    weeklyDriftSpec,
    readinessSpec,
  ]
  specs.forEach(validateIndexSpec)

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
