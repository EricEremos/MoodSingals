export type Citation = {
  id: string
  title: string
  authors: string
  year: number
  source_type: 'paper' | 'report' | 'guide' | 'meta-analysis'
  url: string
}

export type ConfidenceSpec = {
  low: string
  medium: string
  high: string
}

export type IndexSpec = {
  id: string
  name: string
  user_question: string
  construct: string
  primary_inputs: string[]
  matching_rule: string
  formula: string
  units: string
  normalization: string
  minimum_data: string
  confidence: ConfidenceSpec
  limitations: string[]
  citations: Citation[]
  validation_plan: string
  change_log: string[]
}

export type IndexResult = {
  spec: IndexSpec
  insight: string
  detailsNote?: string
  microAction: string
  vizSpec: import('./viz').VizSpec
  data: Record<string, unknown>
  confidence: {
    level: 'Low' | 'Med' | 'High'
    reasons: string[]
  }
  gap?: {
    message: string
    ctaLabel: string
    ctaHref: string
  }
  relevance: number
}

export function validateIndexSpec(spec: IndexSpec) {
  const missing: string[] = []
  const required: Array<keyof IndexSpec> = [
    'id',
    'name',
    'user_question',
    'construct',
    'primary_inputs',
    'matching_rule',
    'formula',
    'units',
    'normalization',
    'minimum_data',
    'confidence',
    'limitations',
    'citations',
    'validation_plan',
    'change_log',
  ]
  for (const field of required) {
    if (spec[field] === undefined || spec[field] === null) missing.push(String(field))
  }
  if (missing.length) {
    throw new Error(`IndexSpec missing required fields: ${missing.join(', ')}`)
  }
}
