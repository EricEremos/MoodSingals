import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'
export function happyAnchorsCard(context: InsightContext): InsightCardResult {
  const positives = context.spendMoments.filter((moment) => moment.valence >= 0.4)
  const byCategory = positives.reduce<Record<string, number>>((acc, moment) => {
    acc[moment.category] = (acc[moment.category] || 0) + 1
    return acc
  }, {})
  const labels = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]).slice(0, 4)
  const values = labels.map((label) => byCategory[label])
  const total = positives.length

  const gap =
    total < 5
      ? {
        message: 'Need 5 positive moments to find anchors.',
        ctaLabel: 'Log a spend moment',
          ctaHref: '/today',
        }
      : undefined

  return {
    id: 'happy-anchors',
    title: 'Worth-it spending',
    insight:
      labels.length > 0
        ? `Positive moments show up most in ${labels[0]}.`
        : 'No “worth-it” pattern yet.',
    data: { byCategory },
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['Log positive moments'], values: [1] },
    microAction: 'Protect one worth-it spend.',
    confidence: context.confidence,
    howComputed: 'Positive-mood spend moments.',
    evidence: BASE_EVIDENCE,
    limits: BASE_LIMITS,
    relevance: 0.85,
    gap,
  }
}
