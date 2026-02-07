import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const impulseRiskSpec: IndexSpec = {
  id: 'impulse-risk-proxy',
  name: 'Impulse Risk Proxy',
  user_question: 'When do I tend to spend impulsively?',
  construct: 'Affect‑driven impulse tendency (descriptive).',
  primary_inputs: ['spend_moments.urge_level', 'mood_logs', 'transactions.category'],
  matching_rule: 'Nearest mood within -2h/+6h; manual links override.',
  formula:
    'Percent of discretionary spend occurring when valence ≤ -1 and arousal ≥ 1.5.',
  units: '% of discretionary spend',
  normalization: 'Within‑user baseline (compare to overall discretionary share).',
  minimum_data: '≥20 discretionary transactions and ≥7 moods.',
  confidence: {
    low: 'Below 20 discretionary spends or 7 moods.',
    medium: 'Meets minimum data but link coverage <40%.',
    high: '≥20 discretionary spends, ≥7 moods, ≥40% link coverage.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Discretionary categories are approximate.',
    'Depends on accurate timestamps.',
  ],
  citations: cite('impulseMeta2021', 'russell1980'),
  validation_plan: 'Compare results before/after 2 weeks; check sensitivity to window size.',
  change_log: ['v1.0 initial spec'],
}
