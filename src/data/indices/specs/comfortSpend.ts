import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const comfortSpendSpec: IndexSpec = {
  id: 'comfort-spend-pattern',
  name: 'Comfort Spend Pattern',
  user_question: 'Do I spend more after low‑mood moments?',
  construct: 'Emotion‑linked coping behavior (descriptive).',
  primary_inputs: ['spend_moments', 'mood_logs', 'transactions.category'],
  matching_rule: 'Nearest mood within -2h/+6h; manual links override.',
  formula:
    'Compare discretionary spend after low‑valence moods vs baseline discretionary spend.',
  units: 'Delta amount + % change',
  normalization: 'Within‑user baseline.',
  minimum_data: '≥20 linked spend records and ≥7 moods.',
  confidence: {
    low: 'Below 20 linked spends or 7 moods.',
    medium: 'Meets minimum data but link coverage <40%.',
    high: '≥20 linked spends, ≥7 moods, ≥40% link coverage.',
  },
  limitations: [
    'Discretionary category lists are approximate.',
    'Correlation ≠ causation.',
  ],
  citations: cite('rick2014', 'russell1980'),
  validation_plan: 'Check stability after 2–4 weeks; user interview for clarity.',
  change_log: ['v1.0 initial spec'],
}
