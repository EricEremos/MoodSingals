import type { InsightCardResult, InsightContext } from '../index'

export function regretProxyCard(_context: InsightContext): InsightCardResult {
  return {
    id: 'regret-proxy',
    title: 'Regret Proxy (V2)',
    insight: 'Coming soon: a quick satisfaction toggle to learn from each spend.',
    data: {},
    vizSpec: { type: 'bar', labels: ['Coming soon'], values: [1] },
    microAction: 'For now, add a short note if a spend felt off.',
    confidence: { level: 'Low', reasons: ['Satisfaction toggle not enabled yet'] },
    howComputed: 'Will use a 1–5 satisfaction check after spend moments.',
    relevance: 0.5,
    gap: {
      message: 'This card activates after satisfaction tracking is enabled.',
      ctaLabel: 'Log a spend moment',
      ctaHref: '/log',
    },
  }
}
