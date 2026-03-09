import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const impulseRiskSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'impulse-risk-proxy',
  name: 'Impulse Risk Proxy',
  user_question: 'When does discretionary spending cluster around low mood and high energy?',
  construct: 'Affect-linked impulse tendency proxy (descriptive, non-clinical).',
  primary_inputs: [
    'transactions.{category,outflow,occurred_at}',
    'tx_mood_annotations.{valence,arousal}',
    'mood_logs.{mood_valence,mood_arousal,tags}',
  ],
  matching_rule:
    'Manual transaction mood annotation overrides all. Otherwise link transaction to nearest mood in [-2h, +6h].',
  formula:
    'Percent of discretionary spend occurring when valence ≤ -1 and arousal ≥ 1.5.',
  units: '% of discretionary spend',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥20 discretionary transactions and ≥7 moods.',
  confidence: {
    mapping_function:
      'LOW if discretionary_linked < 20 or mood_logs < 7; MED if threshold met; HIGH if discretionary_linked >= 40 and mood_logs >= 14.',
    low: 'Below 20 discretionary linked transactions or 7 mood logs.',
    medium: 'At least 20 discretionary linked transactions and 7 mood logs.',
    high: 'At least 40 discretionary linked transactions and 14 mood logs.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Discretionary categories are approximate.',
    'Depends on accurate timestamps.',
  ],
  citations: cite('online_impulse_meta_2021', 'russell1980_circumplex'),
  validation_plan: [
    'Comprehension test: user can describe why this is a proxy, not a diagnosis.',
    'Reliability test: compare risk share over adjacent 2-week windows.',
    'Sensitivity test: compare output at 4h vs 6h forward windows.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
