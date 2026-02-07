import type { InsightCardResult, InsightContext } from '../index'
import { confidenceFromCount } from '../confidence'

export function topTriggerTagsCard(context: InsightContext): InsightCardResult {
  const tagCounts = context.spendMoments.reduce<Record<string, number>>((acc, moment) => {
    moment.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  const labels = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 4)
  const values = labels.map((label) => tagCounts[label])
  const totalTags = Object.values(tagCounts).reduce((acc, v) => acc + v, 0)

  const confidence = confidenceFromCount({
    count: totalTags,
    minMed: 5,
    minHigh: 12,
    reasonLabel: 'tagged moments',
  })

  const gap =
    totalTags < 5
      ? {
          message: 'Add tags to 5 spend moments to surface your top triggers.',
          ctaLabel: 'Log with tags',
          ctaHref: '/log',
        }
      : undefined

  return {
    id: 'top-trigger-tags',
    title: 'Top Trigger Tags',
    insight:
      labels.length > 0
        ? `Most tagged moments: ${labels.join(', ')}.`
        : 'No trigger tags yet.',
    data: { tagCounts },
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['Add tags'], values: [1] },
    microAction: 'Add one tag to your next spend moment.',
    confidence,
    howComputed: 'Counts the tags you add to spend moments.',
    relevance: 0.9,
    gap,
  }
}
