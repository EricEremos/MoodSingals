import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { worthItAnchorsSpec } from '../../indices/specs/worthItAnchors'
import { directConfidence } from '../confidence'

export function happyAnchorsCard(context: InsightContext): IndexResult {
  const worthMoments = context.spendMoments.filter((moment) => moment.worth_it)
  const worthTx = context.linkedTransactions.filter((tx) => tx.worth_it)
  const byCategory: Record<string, number> = {}
  const byMerchant: Record<string, number> = {}

  worthMoments.forEach((moment) => {
    byCategory[moment.category] = (byCategory[moment.category] || 0) + 1
  })
  worthTx.forEach((tx) => {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + 1
    byMerchant[tx.merchant] = (byMerchant[tx.merchant] || 0) + 1
  })

  const labels = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]).slice(0, 4)
  const values = labels.map((label) => byCategory[label])
  const total = worthMoments.length + worthTx.length

  const confidence = directConfidence(context.directCount)
  if (total < 10) confidence.reasons.push('Need 10 worth‑it marks')

  return {
    spec: worthItAnchorsSpec,
    insight:
      labels.length > 0
        ? `Worth‑it shows up most in ${labels[0]}.`
        : 'No worth‑it pattern yet.',
    data: { byCategory, byMerchant },
    detailsNote: 'Uses manual worth‑it marks.',
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['Mark worth‑it'], values: [1] },
    microAction: 'Mark a spend as worth‑it when it feels right.',
    confidence,
    relevance: 0.8,
    gap:
      total < 10
        ? { message: 'Need 10 worth‑it marks.', ctaLabel: 'Open timeline', ctaHref: '/timeline' }
        : undefined,
  }
}
