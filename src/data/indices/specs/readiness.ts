import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const readinessSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'readiness-coverage',
  name: 'Readiness + Coverage',
  user_question: 'What data is missing to improve insights?',
  construct: 'Measurement validity and confidence readiness.',
  primary_inputs: [
    'mood_logs.count',
    'transactions.count',
    'spend_moments.count',
    'tx_mood_annotations.count',
    'link_tiers.{DIRECT,INFERRED,UNLINKED}',
  ],
  matching_rule: 'Meta-card using record counts and linkage coverage only.',
  formula:
    'Compute direct tags, linked coverage, and minimum data gaps; return next best action to increase evidence quality.',
  units: 'Counts + % coverage',
  normalization: 'Within-user baseline only.',
  minimum_data: 'Always available.',
  confidence: {
    mapping_function: 'Always available; confidence badge reflects current DIRECT data sufficiency tier.',
    low: 'Below 10 DIRECT mood-tagged purchases.',
    medium: 'At least 10 DIRECT mood-tagged purchases.',
    high: 'At least 20 DIRECT mood-tagged purchases.',
  },
  limitations: [
    'Counts do not capture all quality issues.',
    'Link coverage is descriptive and depends on logging behavior.',
  ],
  citations: cite('michie2011_comb'),
  validation_plan: [
    'Comprehension test: user can identify the next action from the card.',
    'Behavior test: readiness CTA click-through rate [estimate] then measured in Study Mode.',
    'Reliability test: readiness score should improve after tagging/import actions.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
