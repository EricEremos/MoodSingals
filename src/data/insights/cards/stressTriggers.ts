import type { InsightCardResult, InsightContext } from '../index'
import { BASE_EVIDENCE, BASE_LIMITS } from '../evidence'
export function topTriggerTagsCard(context: InsightContext): InsightCardResult {
  const stressLabels = new Set(['Stressed', 'Anxious'])
  const stressMoments = context.spendMoments.filter((moment) =>
    stressLabels.has(moment.mood_label),
  )
  const tagCounts = stressMoments.reduce<Record<string, number>>((acc, moment) => {
    moment.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  const labels = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 4)
  const values = labels.map((label) => tagCounts[label])
  const totalTags = Object.values(tagCounts).reduce((acc, v) => acc + v, 0)

  const gap =
    totalTags < 5
      ? {
        message: 'Add tags to 5 spend moments to surface triggers.',
        ctaLabel: 'Log with tags',
          ctaHref: '/today',
        }
      : undefined

  return {
    id: 'top-trigger-tags',
    title: 'Top triggers',
    insight:
      labels.length > 0
        ? `Top stress tags: ${labels.join(', ')}.`
        : 'No stress tags yet.',
    data: { tagCounts },
    vizSpec:
      labels.length > 0
        ? { type: 'bar', labels, values }
        : { type: 'bar', labels: ['Add tags'], values: [1] },
    microAction: 'Add one tag next time.',
    confidence: context.confidence,
    howComputed: 'Counts tags on spend moments.',
    evidence: BASE_EVIDENCE,
    limits: BASE_LIMITS,
    relevance: 0.9,
    gap,
  }
}
