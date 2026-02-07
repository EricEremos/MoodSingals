import type { MoodLog, SpendMoment, Transaction } from '../db'
import { confidenceFromCount, type Confidence } from './confidence'
import { dataGapMirrorCard } from './cards/heatmap'
import { topTriggerTagsCard } from './cards/stressTriggers'
import { lateNightLeakCard } from './cards/lateNight'
import { impulseMomentsMapCard } from './cards/impulseRisk'
import { smallFrequentLeaksCard } from './cards/comfortSpend'
import { happyAnchorsCard } from './cards/happyAnchors'
import { replacementWinsCard } from './cards/weekdayDrift'
import { regretProxyCard } from './cards/unlinkedShare'

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
  confidence: Confidence
}

export function computeInsights(
  spendMoments: SpendMoment[],
  moodLogs: MoodLog[],
  transactions: Transaction[],
) {
  const sampleSize = spendMoments.length
  const confidence = confidenceFromCount({
    count: sampleSize,
    minMed: 10,
    minHigh: 30,
    reasonLabel: 'spend moments',
  })

  const context: InsightContext = {
    moodLogs,
    spendMoments,
    transactions,
    sampleSize,
    confidence,
  }

  const cards = [
    impulseMomentsMapCard,
    topTriggerTagsCard,
    lateNightLeakCard,
    happyAnchorsCard,
    smallFrequentLeaksCard,
    replacementWinsCard,
    regretProxyCard,
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
