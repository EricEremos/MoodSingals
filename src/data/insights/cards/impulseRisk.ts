import type { InsightCardResult, InsightContext } from '../index'
import { mean } from '../../../utils/stats'

export function impulseRiskCard(context: InsightContext): InsightCardResult {
  const risky = context.linked.filter(
    (tx) => tx.linkedMood && tx.linkedMood.mood_valence < -0.3 && tx.linkedMood.mood_arousal > 0.3,
  )
  const avg = mean(risky.map((tx) => tx.outflow))

  return {
    id: 'impulse-risk',
    title: 'Impulse Risk Proxy',
    insight:
      risky.length > 0
        ? `High-arousal, low-valence moods average $${avg.toFixed(2)} per outflow.`
        : 'No impulse-risk moments detected yet.',
    data: { avg, count: risky.length },
    vizSpec: {
      type: 'bar',
      labels: ['Impulse-risk spend'],
      values: [avg || 0],
    },
    microAction: 'Try a 2-minute reset before buying when energy is high but mood is low.',
    confidence: context.confidence,
    howComputed: 'Filters linked transactions where mood arousal is high and valence is low.',
    relevance: risky.length ? 0.75 : 0.3,
  }
}
