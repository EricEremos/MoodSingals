import type { MoodLog, Transaction } from '../db'
import { linkTransactionsToMood } from './linkMood'
import { computeConfidence, type Confidence } from './confidence'
import { heatmapCard } from './cards/heatmap'
import { stressTriggersCard } from './cards/stressTriggers'
import { lateNightCard } from './cards/lateNight'
import { impulseRiskCard } from './cards/impulseRisk'
import { comfortSpendCard } from './cards/comfortSpend'
import { happyAnchorsCard } from './cards/happyAnchors'
import { weekdayDriftCard } from './cards/weekdayDrift'
import { unlinkedShareCard } from './cards/unlinkedShare'

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
  relevance: number
}

export type InsightContext = {
  transactions: Transaction[]
  moodLogs: MoodLog[]
  linked: ReturnType<typeof linkTransactionsToMood>
  sampleSize: number
  missingness: number
  timeUnknownPct: number
  confidence: Confidence
}

export function computeInsights(transactions: Transaction[], moodLogs: MoodLog[]) {
  const linked = linkTransactionsToMood(transactions, moodLogs)
  const sampleSize = transactions.length
  const missingness = sampleSize
    ? linked.filter((tx) => !tx.linkedMood).length / sampleSize
    : 1
  const timeUnknownPct = sampleSize
    ? transactions.filter((tx) => tx.time_unknown).length / sampleSize
    : 0
  const confidence = computeConfidence({
    sampleSize,
    missingness,
    timeUnknownPct,
  })

  const context: InsightContext = {
    transactions,
    moodLogs,
    linked,
    sampleSize,
    missingness,
    timeUnknownPct,
    confidence,
  }

  const cards = [
    heatmapCard,
    stressTriggersCard,
    lateNightCard,
    impulseRiskCard,
    comfortSpendCard,
    happyAnchorsCard,
    weekdayDriftCard,
    unlinkedShareCard,
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
