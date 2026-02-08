import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const smallFrequentLeaksSpec: IndexSpec = {
  id: 'small-frequent-leaks',
  name: 'Small Frequent Leaks',
  user_question: 'Where do small spends add up?',
  construct: 'Accumulation of micro‑spends (descriptive).',
  primary_inputs: ['spend_moments.amount', 'transactions.outflow'],
  matching_rule: 'No mood linkage required.',
  formula: 'Count spends ≤ $15 in last 7 days and compare to baseline.',
  units: 'Count per week [estimate]',
  normalization: 'Within‑user baseline.',
  minimum_data: '≥12 spend records.',
  confidence: {
    low: 'Below 12 spend records.',
    medium: '12+ records, limited week coverage.',
    high: '30+ records with recent activity.',
  },
  limitations: [
    'Estimate; replace with 4‑week average.',
    'Correlation ≠ causation.',
  ],
  citations: cite('michie2011'),
  validation_plan: 'Replace [estimate] with 4‑week rolling average.',
  change_log: ['v1.0 initial spec'],
}
