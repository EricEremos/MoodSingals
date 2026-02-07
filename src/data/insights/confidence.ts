export type ConfidenceLevel = 'High' | 'Med' | 'Low'

export type Confidence = {
  level: ConfidenceLevel
  reasons: string[]
}

export function computeConfidence(params: {
  sampleSize: number
  missingness: number
  timeUnknownPct: number
}): Confidence {
  const reasons: string[] = []
  const { sampleSize, missingness, timeUnknownPct } = params

  if (sampleSize < 20) reasons.push('Small sample size')
  if (missingness > 0.25) reasons.push('Many transactions are unlinked')
  if (timeUnknownPct > 0.35) reasons.push('Many transactions lack a time')

  let level: ConfidenceLevel = 'Med'
  if (sampleSize >= 50 && missingness <= 0.15 && timeUnknownPct <= 0.2) {
    level = 'High'
  } else if (sampleSize < 20 || missingness > 0.35 || timeUnknownPct > 0.45) {
    level = 'Low'
  }

  return { level, reasons }
}
