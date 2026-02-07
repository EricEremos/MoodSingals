import type { IndexSpec } from '../types'
import { cite } from '../evidence'

export const worthItAnchorsSpec: IndexSpec = {
  id: 'worth-it-anchors',
  name: 'Worth‑It Anchors',
  user_question: 'Which spends felt worth it for me?',
  construct: 'Positive reinforcement of intentional spending.',
  primary_inputs: ['transactions.worth_it', 'spend_moments.worth_it'],
  matching_rule: 'Manual “worth‑it” mark on a spend record.',
  formula: 'Count worth‑it marks by category and merchant.',
  units: 'Count of worth‑it marks',
  normalization: 'Within‑user baseline.',
  minimum_data: '≥10 worth‑it marks.',
  confidence: {
    low: 'Below 10 worth‑it marks.',
    medium: '10+ marks but concentrated in one week.',
    high: '10+ marks spread across ≥2 weeks.',
  },
  limitations: [
    'Depends on manual marking.',
    'Early data can be sparse.',
  ],
  citations: cite('michie2011'),
  validation_plan: 'Track adoption of marking; check stability after 4 weeks.',
  change_log: ['v1.0 initial spec'],
}
