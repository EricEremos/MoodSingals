import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { worthItAnchorsSpec } from '../../indices/specs/worthItAnchors'
import type { Confidence } from '../confidence'

const toWeekKey = (iso: string) => {
  const date = new Date(iso)
  const weekday = date.getDay()
  const mondayOffset = (weekday + 6) % 7
  date.setDate(date.getDate() - mondayOffset)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

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

  const weekKeys = new Set<string>()
  worthMoments.forEach((moment) => {
    weekKeys.add(toWeekKey(moment.created_at))
  })
  worthTx.forEach((tx) => {
    weekKeys.add(toWeekKey(tx.occurred_at))
  })
  const confidence: Confidence =
    total < 10
      ? { level: 'Low', reasons: ['Need 10 worth-it marks'] }
      : total < 20 || weekKeys.size < 2
        ? { level: 'Med', reasons: ['Add more worth-it marks across multiple weeks'] }
        : { level: 'High', reasons: [] }

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
