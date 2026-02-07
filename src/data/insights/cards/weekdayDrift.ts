import type { InsightCardResult, InsightContext } from '../index'
export function replacementWinsCard(context: InsightContext): InsightCardResult {
  const replacements = context.spendMoments.filter((moment) =>
    moment.tags.some((tag) => tag.toLowerCase().includes('replace') || tag.toLowerCase().includes('swap')),
  )
  const total = replacements.length

  const gap =
    total < 2
      ? {
        message: 'Tag 2 moments as “replace” or “swap” to track wins.',
        ctaLabel: 'Log with tag',
          ctaHref: '/today',
        }
      : undefined

  return {
    id: 'replacement-wins',
    title: 'Wins',
    insight: total ? `${total} wins logged.` : 'No wins yet.',
    data: { total },
    vizSpec: { type: 'spark', values: [0, Math.max(total, 1), total] },
    microAction: 'Tag a win when you resist.',
    confidence: context.confidence,
    howComputed: 'Counts moments tagged replace or swap.',
    evidence: ['Behavior change: COM‑B nudges.', 'Small wins reinforce habits.'],
    limits: ['Only tracks tagged wins.', 'Correlation ≠ causation.'],
    relevance: 0.7,
    gap,
  }
}
