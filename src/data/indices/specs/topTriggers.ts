import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const topTriggersSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'top-emotional-triggers',
  name: 'Top 3 Emotional Triggers',
  user_question: 'Which categories rise most during low-mood moments?',
  construct: 'Descriptive coping and emotional regulation patterns.',
  primary_inputs: [
    'transactions.category',
    'spend_moments.category',
    'tx_mood_annotations.valence',
    'mood_logs.mood_valence',
  ],
  matching_rule:
    'Manual transaction mood annotation overrides all. Otherwise link transaction to nearest mood in [-2h, +6h].',
  formula:
    'Compute category lift during low-valence moods vs each category baseline share and return top 3 by lift.',
  units: 'Lift vs baseline (%)',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥30 linked spend records and ≥7 moods.',
  confidence: {
    mapping_function:
      'LOW if linked_spend < 30 or mood_logs < 7; MED if threshold met; HIGH if linked_spend >= 60 and top category sample >= 10.',
    low: 'Below 30 linked spend records or 7 mood logs.',
    medium: 'At least 30 linked records and 7 mood logs.',
    high: 'At least 60 linked records, 14 mood logs, and top trigger sample >= 10.',
  },
  limitations: [
    'Category labels can be noisy.',
    'Correlation ≠ causation.',
    'Missing tags reduce signal.',
  ],
  citations: cite('rick2014_retail_therapy', 'russell1980_circumplex'),
  validation_plan: [
    'Comprehension test: user can explain "lift vs baseline" in plain language.',
    'Reliability test: top 3 ranking stability across adjacent weeks.',
    'Sensitivity test: compare low-valence cutoff at -1 vs -2.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
