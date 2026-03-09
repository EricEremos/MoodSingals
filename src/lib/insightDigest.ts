import type { IndexResult } from '../data/indices/types'

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
  cards: IndexResult[]
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
      id: card.spec.id,
      title: card.spec.name,
      insight: card.insight,
      microAction: card.microAction,
      confidenceLevel: card.confidence.level,
      relevance: card.relevance,
    })),
    lowConfidenceCount: cards.filter((card) => card.confidence.level === 'Low').length,
  }
}
