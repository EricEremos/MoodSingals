import { describe, expect, it } from 'vitest'
import { buildInsightDigest } from './insightDigest'
import type { InsightCardResult } from '../data/insights'

const makeCard = (overrides: Partial<InsightCardResult> = {}): InsightCardResult => ({
  id: 'late-night',
  title: 'Late-night leak',
  insight: 'Late-night ordering spikes after stressful days.',
  data: {},
  vizSpec: { type: 'bar', labels: ['Dining'], values: [3] },
  microAction: 'Set a 10 minute pause before ordering.',
  confidence: { level: 'Med', reasons: [] },
  howComputed: 'Counts late-night dining moments.',
  relevance: 0.8,
  ...overrides,
})

describe('buildInsightDigest', () => {
  it('keeps the top five cards and counts low-confidence cards', () => {
    const cards = [
      makeCard({ id: '1' }),
      makeCard({ id: '2', confidence: { level: 'Low', reasons: ['Small sample'] } }),
      makeCard({ id: '3' }),
      makeCard({ id: '4' }),
      makeCard({ id: '5' }),
      makeCard({ id: '6', confidence: { level: 'Low', reasons: ['Sparse data'] } }),
    ]

    const digest = buildInsightDigest({
      cards,
      reflectionDue: true,
      counts: {
        spendMoments: 12,
        moodLogs: 9,
        transactions: 40,
        imports: 2,
      },
    })

    expect(digest.topCards).toHaveLength(5)
    expect(digest.lowConfidenceCount).toBe(2)
    expect(digest.reflectionDue).toBe(true)
    expect(digest.counts.transactions).toBe(40)
  })
})
