import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function impulseMomentsMapCard(context: InsightContext): InsightCardResult {
  const highUrge = context.spendMoments.filter(
    (moment) => moment.urge_level === 2 && moment.valence < 0,
  )
  const byCategory = highUrge.reduce<Record<string, number>>((acc, moment) => {
    acc[moment.category] = (acc[moment.category] || 0) + 1
    return acc
  }, {})
  const labels = Object.keys(byCategory)
  const values = labels.map((label) => byCategory[label])
  const total = highUrge.length

  const confidence = confidenceFromCount({
    count: total,
    minMed: 3,
    minHigh: 8,
    reasonLabel: 'high-urge moments',
  })

  const gap =
    total < 3
      ? {
          message: 'Need 3 high-urge moments to map a pattern.',
          ctaLabel: 'Log a spend moment',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'impulse-moments-map',
    title: 'Impulse moments',
    insight:
      total >= 3
        ? `High-urge moments show up most in ${labels[0] || 'a few categories'}.`
        : 'No pattern yet.',
    data: { total, byCategory },
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['No data'], values: [1] },
    microAction: 'Pause once before a high-urge spend.',
    confidence,
    howComputed: 'High-urge spends with low mood.',
    relevance: 0.95,
    gap,
  }
}
