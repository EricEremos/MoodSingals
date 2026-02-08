import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const weeklyDriftSpec: IndexSpec = {
  standard_version: 'index_standard_v1',
  id: 'weekly-drift',
  name: 'Weekly Drift',
  user_question: 'Do mood swings and spending swings move together week to week?',
  construct: 'Descriptive mood/spend self-regulation stability signal.',
  primary_inputs: ['mood_logs', 'transactions', 'spend_moments'],
  matching_rule: 'Weekly aggregates; no per‑record linking required.',
  formula: 'Compute weekly mood variance vs weekly spend variance; show correlation.',
  units: 'Correlation (‑1 to 1)',
  normalization: 'Within-user baseline only.',
  minimum_data: '≥4 weeks of data.',
  confidence: {
    mapping_function:
      'LOW if complete_weeks < 4; MED if >= 4; HIGH if >= 8 complete weeks with at least 3 moods each week.',
    low: 'Below 4 complete weeks.',
    medium: 'At least 4 complete weeks.',
    high: 'At least 8 complete weeks with stable weekly logging.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Short history can be noisy.',
  ],
  citations: cite('michie2011_comb'),
  validation_plan: [
    'Comprehension test: user can interpret correlation direction without overclaims.',
    'Reliability test: rolling 4-week correlation stability.',
    'Sensitivity test: compare week definitions (calendar vs rolling).',
  ],
  change_log: ['v1.1 index standard v1 migration'],
}
