import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function replacementWinsCard(context: InsightContext): InsightCardResult {
  const replacements = context.spendMoments.filter((moment) =>
    moment.tags.some((tag) => tag.toLowerCase().includes('replace') || tag.toLowerCase().includes('swap')),
  )
  const total = replacements.length

  const confidence = confidenceFromCount({
    count: total,
    minMed: 2,
    minHigh: 5,
    reasonLabel: 'replacement wins',
  })

  const gap =
    total < 2
      ? {
          message: 'Tag 2 moments as “replace” or “swap” to track wins.',
          ctaLabel: 'Log with tag',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'replacement-wins',
    title: 'Replacement Wins',
    insight: total ? `You logged ${total} replacement wins this period.` : 'No replacement wins yet.',
    data: { total },
    vizSpec: { type: 'spark', values: [0, Math.max(total, 1), total] },
    microAction: 'Try one small swap this week and tag it.',
    confidence,
    howComputed: 'Counts spend moments tagged as replace or swap.',
    relevance: 0.7,
    gap,
  }
}
