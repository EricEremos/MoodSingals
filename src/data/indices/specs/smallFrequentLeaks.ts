import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const smallFrequentLeaksSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'small-frequent-leaks',
  name: 'Small Frequent Leaks',
  user_question: 'Where do small spends add up?',
  construct: 'Accumulation of micro‑spends (descriptive).',
  primary_inputs: ['spend_moments.amount', 'transactions.outflow'],
  matching_rule: 'No mood linkage required.',
  formula: 'Count spends ≤ $15 in last 7 days and compare to baseline.',
  units: 'Count per week [estimate]',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥12 spend records.',
  confidence: {
    mapping_function:
      'LOW if spend_records < 12; MED if >= 12; HIGH if >= 30 with at least 3 active weeks.',
    low: 'Below 12 spend records.',
    medium: 'At least 12 spend records.',
    high: 'At least 30 spend records with recent activity.',
  },
  limitations: [
    'Estimate; replace with 4‑week average.',
    'Correlation ≠ causation.',
  ],
  citations: cite('michie2011_comb'),
  validation_plan: [
    'Comprehension test: user understands this is an estimate.',
    'Measurement plan: replace weekly estimate with 4-week rolling average.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
