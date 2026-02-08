export type Citation = {
  id: string
  title: string
  authors: string
  year: number
  source_type: 'paper' | 'report' | 'guide' | 'meta-analysis'
  url: string
}

export type ConfidenceSpec = {
  mapping_function: string
  low: string
  medium: string
  high: string
}

export type IndexStandardVersion = 'index_standard_v1'

export type IndexSpec = {
  standard_version: IndexStandardVersion
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
  validation_plan: string[]
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
    'standard_version',
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

  if (spec.standard_version !== 'index_standard_v1') {
    throw new Error(`IndexSpec ${spec.id} has unsupported standard version: ${spec.standard_version}`)
  }
  if (!spec.primary_inputs.length) {
    throw new Error(`IndexSpec ${spec.id} must define at least one primary input`)
  }
  if (!spec.citations.length) {
    throw new Error(`IndexSpec ${spec.id} must cite at least one evidence source`)
  }
  if (!spec.limitations.length) {
    throw new Error(`IndexSpec ${spec.id} must include at least one limitation`)
  }
  if (!spec.change_log.length) {
    throw new Error(`IndexSpec ${spec.id} must include at least one change log entry`)
  }
  if (!spec.validation_plan.length) {
    throw new Error(`IndexSpec ${spec.id} must include a validation plan`)
  }
  if (!spec.confidence.mapping_function?.trim()) {
    throw new Error(`IndexSpec ${spec.id} must define confidence.mapping_function`)
  }
  if (!spec.normalization.toLowerCase().includes('within-user') && !spec.normalization.toLowerCase().includes('absolute')) {
    throw new Error(`IndexSpec ${spec.id} normalization must state within-user or absolute scale`)
  }
}
