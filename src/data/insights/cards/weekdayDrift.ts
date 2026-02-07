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
    title: 'Wins',
    insight: total ? `${total} wins logged.` : 'No wins yet.',
    data: { total },
    vizSpec: { type: 'spark', values: [0, Math.max(total, 1), total] },
    microAction: 'Tag a win when you resist.',
    confidence,
    howComputed: 'Counts moments tagged replace or swap.',
    relevance: 0.7,
    gap,
  }
}
