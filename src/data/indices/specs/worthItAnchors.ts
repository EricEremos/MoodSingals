import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const worthItAnchorsSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'worth-it-anchors',
  name: 'Worth-It Spend Anchors',
  user_question: 'Which purchases repeatedly feel worth it?',
  construct: 'Descriptive positive-affect and intentional spending anchors.',
  primary_inputs: ['transactions.worth_it', 'spend_moments.worth_it'],
  matching_rule: 'Manual “worth‑it” mark on a spend record.',
  formula: 'Count worth‑it marks by category and merchant.',
  units: 'Count of worth‑it marks',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥10 worth‑it marks.',
  confidence: {
    mapping_function:
      'LOW if worth_it_marks < 10; MED if >= 10; HIGH if >= 20 across at least 2 weeks.',
    low: 'Below 10 worth-it marks.',
    medium: 'At least 10 worth-it marks.',
    high: 'At least 20 worth-it marks across at least 2 weeks.',
  },
  limitations: [
    'Depends on manual marking.',
    'Early data can be sparse.',
  ],
  citations: cite('michie2011_comb'),
  validation_plan: [
    'Comprehension test: user can describe why an anchor is useful for planning.',
    'Reliability test: top anchors remain stable over 4 weeks.',
    'Sensitivity test: compare category-only vs merchant+category ranking.',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
