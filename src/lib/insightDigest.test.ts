import { describe, expect, it } from 'vitest'
import type { IndexResult } from '../data/indices/types'
import { buildInsightDigest } from './insightDigest'

const makeCard = (overrides: Partial<IndexResult> = {}): IndexResult => ({
  spec: {
    standard_version: 'index_standard_v1',
    id: 'late-night',
    name: 'Late-night leak',
    user_question: 'When do late-night orders show up?',
    construct: 'late-night leakage',
    primary_inputs: ['transactions'],
    matching_rule: 'Transactions between 22:00 and 02:00',
    formula: 'Count matching transactions',
    units: 'transactions',
    normalization: 'absolute',
    minimum_data: 'At least one transaction',
    confidence: {
      mapping_function: 'sample size',
      low: 'small sample',
      medium: 'some data',
      high: 'enough data',
    },
    limitations: ['Small samples can be noisy'],
    citations: [
      {
        id: 'C1',
        title: 'Late-night spending',
        authors: 'MoodSignals',
        year: 2026,
        source_type: 'guide',
        url: 'https://example.com',
      },
    ],
    validation_plan: ['Compare against manual review'],
    change_log: ['Initial version'],
  },
  insight: 'Late-night ordering spikes after stressful days.',
  data: {},
  vizSpec: { type: 'bar', labels: ['Dining'], values: [3] },
  microAction: 'Set a 10 minute pause before ordering.',
  confidence: { level: 'Med', reasons: [] },
  relevance: 0.8,
  ...overrides,
})

describe('buildInsightDigest', () => {
  it('keeps the top five cards and counts low-confidence cards', () => {
    const cards = [
      makeCard({ spec: { ...makeCard().spec, id: '1' } }),
      makeCard({
        spec: { ...makeCard().spec, id: '2' },
        confidence: { level: 'Low', reasons: ['Small sample'] },
      }),
      makeCard({ spec: { ...makeCard().spec, id: '3' } }),
      makeCard({ spec: { ...makeCard().spec, id: '4' } }),
      makeCard({ spec: { ...makeCard().spec, id: '5' } }),
      makeCard({
        spec: { ...makeCard().spec, id: '6' },
        confidence: { level: 'Low', reasons: ['Sparse data'] },
      }),
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
    expect(digest.topCards[0]?.id).toBe('1')
    expect(digest.topCards[0]?.title).toBe('Late-night leak')
    expect(digest.lowConfidenceCount).toBe(2)
    expect(digest.reflectionDue).toBe(true)
    expect(digest.counts.transactions).toBe(40)
  })
})
