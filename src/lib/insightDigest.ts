import type { InsightCardResult } from '../data/insights'

export type InsightDigest = {
  generatedAt: string
  reflectionDue: boolean
  counts: {
    spendMoments: number
    moodLogs: number
    transactions: number
    imports: number
  }
  topCards: Array<{
    id: string
    title: string
    insight: string
    microAction: string
    confidenceLevel: string
    relevance: number
  }>
  lowConfidenceCount: number
}

export function buildInsightDigest(params: {
  cards: InsightCardResult[]
  reflectionDue: boolean
  counts: {
    spendMoments: number
    moodLogs: number
    transactions: number
    imports: number
  }
}): InsightDigest {
  const { cards, reflectionDue, counts } = params

  return {
    generatedAt: new Date().toISOString(),
    reflectionDue,
    counts,
    topCards: cards.slice(0, 5).map((card) => ({
      id: card.id,
      title: card.title,
      insight: card.insight,
      microAction: card.microAction,
      confidenceLevel: card.confidence.level,
      relevance: card.relevance,
    })),
    lowConfidenceCount: cards.filter((card) => card.confidence.level === 'Low').length,
  }
}
