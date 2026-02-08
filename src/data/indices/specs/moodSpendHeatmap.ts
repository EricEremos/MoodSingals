import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const moodSpendHeatmapSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'mood-spend-heatmap',
  name: 'Mood → Spend Heatmap',
  user_question: 'How does spending change across my own mood states?',
  construct: 'Descriptive affect-behavior mapping using a circumplex mood lens.',
  primary_inputs: [
    'spend_moments.amount',
    'spend_moments.valence',
    'spend_moments.arousal',
    'transactions.outflow',
    'tx_mood_annotations.{valence,arousal}',
    'mood_logs.{mood_valence,mood_arousal}',
  ],
  matching_rule:
    'Manual transaction mood annotation overrides all. Otherwise link transaction to nearest mood in [-2h, +6h].',
  formula:
    'Bin linked spend records into valence(-2..+2) x arousal(0..2), then compute average spend and count per bin.',
  units: 'Personal currency per linked record',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥30 linked spend records and ≥7 mood logs.',
  confidence: {
    mapping_function:
      'LOW if linked_spend < 30 or mood_logs < 7; MED if minimum met with low stability; HIGH when minimum met with stable link coverage.',
    low: 'Below 30 linked spend records or 7 mood logs.',
    medium: 'At least 30 linked records and 7 moods.',
    high: 'At least 60 linked records and 14 moods with stable link coverage.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Averages can hide outliers.',
    'Missing mood logs can bias patterns.',
  ],
  citations: cite('russell1980_circumplex', 'bradley_lang1994_sam'),
  validation_plan: [
    'Comprehension test: user explains what one high-intensity cell means.',
    'Reliability test: compare week-over-week cell ranking stability.',
    'Sensitivity test: rerun with 4h and 8h windows and compare drift.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
