import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const lateNightSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'late-night-leak',
  name: 'Late-Night Leak',
  user_question: 'How much of my spending happens late at night?',
  construct: 'Time-of-day vulnerability pattern (descriptive).',
  primary_inputs: ['transactions.occurred_at', 'spend_moments.created_at'],
  matching_rule: 'Uses timestamps only; no mood linkage required.',
  formula: 'Compute share of spend records between 22:00 and 02:00 vs all other hours.',
  units: '% of spend records',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥30 spend records with timestamps.',
  confidence: {
    mapping_function:
      'LOW if timestamped_records < 30; MED if >=30 with missing-time imports; HIGH if >=60 and missing-time share <= 20%.',
    low: 'Below 30 timestamped records.',
    medium: 'At least 30 timestamped records with partial time coverage.',
    high: 'At least 60 timestamped records with strong time coverage.',
  },
  limitations: [
    'Missing transaction times reduce accuracy.',
    'Correlation ≠ causation.',
  ],
  citations: cite('michie2011_comb'),
  validation_plan: [
    'Comprehension test: user identifies which hours are counted.',
    'Reliability test: compare 2-week late-night share stability.',
    'Sensitivity test: compare fixed 22-02 window to 23-03 [estimate] for robustness.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
