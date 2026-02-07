import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const lateNightSpec: IndexSpec = {
  id: 'late-night-leak',
  name: 'Late‑Night Leak',
  user_question: 'How much of my spending happens late night?',
  construct: 'Time‑of‑day vulnerability (descriptive).',
  primary_inputs: ['transactions.occurred_at', 'spend_moments.created_at'],
  matching_rule: 'Uses timestamps only; no mood linkage required.',
  formula: 'Share of spend records between 22:00–02:00 vs other hours.',
  units: '% of spend records',
  normalization: 'Within‑user baseline (share compared to all hours).',
  minimum_data: '≥30 spend records with timestamps.',
  confidence: {
    low: 'Below 30 timestamped records.',
    medium: '30+ records but time missing for most imports.',
    high: '30+ records with reliable time coverage.',
  },
  limitations: [
    'Time‑missing imports reduce accuracy.',
    'Correlation ≠ causation.',
  ],
  citations: cite('michie2011'),
  validation_plan: 'Check stability week‑over‑week; ensure user recognizes pattern.',
  change_log: ['v1.0 initial spec'],
}
