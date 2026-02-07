import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const topTriggersSpec: IndexSpec = {
  id: 'top-emotional-triggers',
  name: 'Top Emotional Triggers',
  user_question: 'Which categories rise during low‑mood moments?',
  construct: 'Coping / emotional regulation patterns (descriptive).',
  primary_inputs: ['spend_moments.category', 'mood_logs'],
  matching_rule: 'Nearest mood within -2h/+6h; manual links override.',
  formula:
    'Compute category lift during low‑valence moods vs baseline category share.',
  units: 'Lift vs baseline (%)',
  normalization: 'Within‑user baseline (category share across all spend).',
  minimum_data: '≥30 linked spend records and ≥7 moods.',
  confidence: {
    low: 'Below 30 linked spends or 7 moods.',
    medium: 'Meets minimum data but link coverage <40%.',
    high: '≥30 linked spends, ≥7 moods, ≥40% link coverage.',
  },
  limitations: [
    'Category labels can be noisy.',
    'Correlation ≠ causation.',
    'Missing tags reduce signal.',
  ],
  citations: cite('rick2014', 'russell1980'),
  validation_plan: 'User comprehension test + category stability over 4 weeks.',
  change_log: ['v1.0 initial spec'],
}
