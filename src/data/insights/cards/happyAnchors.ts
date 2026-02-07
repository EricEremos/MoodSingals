import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function happyAnchorsCard(context: InsightContext): InsightCardResult {
  const positives = context.spendMoments.filter((moment) => moment.valence >= 0.4)
  const byCategory = positives.reduce<Record<string, number>>((acc, moment) => {
    acc[moment.category] = (acc[moment.category] || 0) + 1
    return acc
  }, {})
  const labels = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]).slice(0, 4)
  const values = labels.map((label) => byCategory[label])
  const total = positives.length

  const confidence = confidenceFromCount({
    count: total,
    minMed: 5,
    minHigh: 12,
    reasonLabel: 'positive moments',
  })

  const gap =
    total < 5
      ? {
          message: 'Need 5 positive-leaning spend moments to find happy anchors.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'happy-anchors',
    title: 'Happy Spend Anchors',
    insight:
      labels.length > 0
        ? `Positive moments show up most in ${labels[0]}.`
        : 'No positive anchors yet.',
    data: { byCategory },
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['Log positive moments'], values: [1] },
    microAction: 'Repeat one positive spend that felt steady.',
    confidence,
    howComputed: 'Looks at spend moments with positive valence.',
    relevance: 0.85,
    gap,
  }
}
