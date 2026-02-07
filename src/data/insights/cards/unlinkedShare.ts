import type { InsightCardResult, InsightContext } from '../index'

export function regretProxyCard(_context: InsightContext): InsightCardResult {
  return {
    id: 'regret-proxy',
    title: 'Regret check',
    insight: 'Coming soon.',
    data: {},
    vizSpec: { type: 'bar', labels: ['Coming soon'], values: [1] },
    microAction: 'Add a short note if a spend felt off.',
    confidence: { level: 'Low', reasons: ['Not enabled yet'] },
    howComputed: 'Satisfaction check after spends.',
    relevance: 0.5,
    gap: {
      message: 'This card activates after satisfaction tracking is enabled.',
      ctaLabel: 'Log a spend moment',
      ctaHref: '/log',
    },
  }
}
