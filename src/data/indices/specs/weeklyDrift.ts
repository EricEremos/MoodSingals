import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const weeklyDriftSpec: IndexSpec = {
  id: 'weekly-drift',
  name: 'Weekly Drift',
  user_question: 'Does mood volatility track spending volatility?',
  construct: 'Self‑regulation stability (descriptive).',
  primary_inputs: ['mood_logs', 'transactions', 'spend_moments'],
  matching_rule: 'Weekly aggregates; no per‑record linking required.',
  formula: 'Compute weekly mood variance vs weekly spend variance; show correlation.',
  units: 'Correlation (‑1 to 1)',
  normalization: 'Within‑user baseline.',
  minimum_data: '≥4 weeks of data.',
  confidence: {
    low: 'Below 4 weeks of data.',
    medium: '4+ weeks but with gaps.',
    high: '4+ complete weeks.',
  },
  limitations: [
    'Correlation ≠ causation.',
    'Short history can be noisy.',
  ],
  citations: cite('michie2011'),
  validation_plan: 'Check stability after 8 weeks; compare to self‑report.',
  change_log: ['v1.0 initial spec'],
}
