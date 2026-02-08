import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const comfortSpendSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'comfort-spend-pattern',
  name: 'Comfort Spend Pattern',
  user_question: 'Do I spend more on discretionary items after low moods?',
  construct: 'Descriptive comfort-spend coping pattern.',
  primary_inputs: [
    'transactions.{category,outflow}',
    'spend_moments.{category,amount,valence}',
    'tx_mood_annotations.valence',
    'mood_logs.mood_valence',
  ],
  matching_rule:
    'Manual transaction mood annotation overrides all. Otherwise link transaction to nearest mood in [-2h, +6h].',
  formula:
    'Compare mean discretionary spend in low-valence windows against mean discretionary spend across all windows.',
  units: 'Delta amount and % change',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥20 linked spend records and ≥7 moods.',
  confidence: {
    mapping_function:
      'LOW if low_valence_linked < 8 or mood_logs < 7; MED if threshold met; HIGH if low_valence_linked >= 20 and mood_logs >= 14.',
    low: 'Below 8 low-valence linked records or 7 mood logs.',
    medium: 'At least 8 low-valence linked records and 7 mood logs.',
    high: 'At least 20 low-valence linked records and 14 mood logs.',
  },
  limitations: [
    'Discretionary category lists are approximate.',
    'Correlation ≠ causation.',
  ],
  citations: cite('rick2014_retail_therapy', 'russell1980_circumplex'),
  validation_plan: [
    'Comprehension test: user can explain baseline vs low-mood comparison.',
    'Reliability test: effect direction stable across 2-week slices.',
    'Sensitivity test: compare discretionary category sets [estimate].',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
