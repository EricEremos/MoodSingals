import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const readinessSpec: IndexSpec = {
  id: 'readiness-coverage',
  name: 'Readiness + Coverage',
  user_question: 'What data is missing to improve insights?',
  construct: 'Measurement validity (data completeness).',
  primary_inputs: ['mood_logs', 'spend_moments', 'transactions'],
  matching_rule: 'Counts + link coverage.',
  formula: 'Compute coverage of moods, spends, and linking; show gaps.',
  units: 'Counts + % coverage',
  normalization: 'Within‑user baseline.',
  minimum_data: 'Always available.',
  confidence: {
    low: 'Always shows; this is the confidence system.',
    medium: 'N/A',
    high: 'N/A',
  },
  limitations: ['Counts do not reflect data quality.', 'Link coverage is heuristic.'],
  citations: cite('michie2011'),
  validation_plan: 'Check whether suggested next steps increase data completeness.',
  change_log: ['v1.0 initial spec'],
}
