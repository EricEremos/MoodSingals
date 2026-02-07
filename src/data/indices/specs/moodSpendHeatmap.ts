import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const moodSpendHeatmapSpec: IndexSpec = {
  id: 'mood-spend-heatmap',
  name: 'Mood → Spend Heatmap',
  user_question: 'How does my spending change across moods?',
  construct: 'Affect–behavior mapping (descriptive).',
  primary_inputs: ['spend_moments.amount', 'spend_moments.mood_label', 'mood_logs'],
  matching_rule: 'Spend moments are linked at log time; imported tx use nearest mood within -2h/+6h.',
  formula: 'Bin spend moments by mood label; compute average spend per mood.',
  units: 'Amount per mood (user currency)',
  normalization: 'Within‑user baseline (compare mood bins to user average).',
  minimum_data: '≥30 linked spend records and ≥7 mood logs.',
  confidence: {
    low: 'Below 30 linked spend records or 7 moods.',
    medium: 'Meets minimum data but link coverage <40%.',
    high: '≥30 linked spend records, ≥7 moods, ≥40% link coverage.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Averages hide outliers.',
    'Missing mood logs can bias patterns.',
  ],
  citations: cite('russell1980'),
  validation_plan: 'Check comprehension + stability after 2 weeks of logging.',
  change_log: ['v1.0 initial spec'],
}
