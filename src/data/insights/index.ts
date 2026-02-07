import type { MoodLog, SpendMoment, Transaction } from '../db'
import { type Confidence } from './confidence'
import { linkTransactionsToMood } from './linkMood'
import { dataGapMirrorCard } from './cards/heatmap'
import { topTriggerTagsCard } from './cards/stressTriggers'
import { lateNightLeakCard } from './cards/lateNight'
import { impulseMomentsMapCard } from './cards/impulseRisk'
import { comfortSpendingPatternCard } from './cards/comfortSpend'
import { happyAnchorsCard } from './cards/happyAnchors'
import { smallFrequentLeaksCard } from './cards/smallFrequentLeaks'
import { moodSpendMapCard } from './cards/moodSpendMap'

export type VizSpec =
  | { type: 'heatmap'; xLabels: string[]; yLabels: string[]; values: number[][] }
  | { type: 'bar'; labels: string[]; values: number[] }
  | { type: 'spark'; values: number[] }
  | { type: 'donut'; labels: string[]; values: number[] }

export type InsightCardResult = {
  id: string
  title: string
  insight: string
  data: Record<string, unknown>
  vizSpec: VizSpec
  microAction: string
  confidence: Confidence
  howComputed: string
  evidence: string[]
  limits: string[]
  relevance: number
  gap?: {
    message: string
    ctaLabel: string
    ctaHref: string
  }
}

export type InsightContext = {
  spendMoments: SpendMoment[]
  moodLogs: MoodLog[]
  transactions: Transaction[]
  sampleSize: number
  linkCoverage: number
  linkedCount: number
  totalSpendRecords: number
  confidence: Confidence
}

export function computeInsights(
  spendMoments: SpendMoment[],
  moodLogs: MoodLog[],
  transactions: Transaction[],
) {
  const linkedTx = linkTransactionsToMood(transactions, moodLogs).filter((tx) => tx.linkedMood)
  const totalSpendRecords = spendMoments.length + transactions.length
  const linkedCount = spendMoments.length + linkedTx.length
  const linkCoverage = totalSpendRecords ? linkedCount / totalSpendRecords : 0

  let level: Confidence['level'] = 'Low'
  if (totalSpendRecords >= 30 && moodLogs.length >= 10 && linkCoverage >= 0.4) {
    level = 'High'
  } else if (totalSpendRecords >= 15 && moodLogs.length >= 7) {
    level = 'Med'
  }

  const reasons: string[] = []
  if (totalSpendRecords < 15) reasons.push('Need 15 spend records')
  if (moodLogs.length < 7) reasons.push('Need 7 mood logs')
  if (linkCoverage < 0.4) reasons.push('Link coverage low')

  const confidence: Confidence = { level, reasons }

  const context: InsightContext = {
    moodLogs,
    spendMoments,
    transactions,
    sampleSize: totalSpendRecords,
    linkCoverage,
    linkedCount,
    totalSpendRecords,
    confidence,
  }

  const cards = [
    moodSpendMapCard,
    topTriggerTagsCard,
    lateNightLeakCard,
    impulseMomentsMapCard,
    comfortSpendingPatternCard,
    happyAnchorsCard,
    smallFrequentLeaksCard,
    dataGapMirrorCard,
  ]
    .map((fn) => fn(context))
    .filter(Boolean) as InsightCardResult[]

  return cards
}

export function confidenceScore(level: Confidence['level']) {
  if (level === 'High') return 3
  if (level === 'Med') return 2
  return 1
}
