export type ConfidenceLevel = 'High' | 'Med' | 'Low'

export type Confidence = {
  level: ConfidenceLevel
  reasons: string[]
}

export function directConfidence(directCount: number): Confidence {
  if (directCount >= 20) {
    return { level: 'High', reasons: [] }
  }
  if (directCount >= 10) {
    return { level: 'Med', reasons: ['Tag 20 for high confidence'] }
  }
  return { level: 'Low', reasons: ['Tag 10 purchases to estimate this reliably.'] }
}

export function confidenceFromCount(params: {
  count: number
  minMed: number
  minHigh: number
  reasonLabel?: string
}): Confidence {
  const { count, minMed, minHigh, reasonLabel } = params
  const reasons: string[] = []
  if (count < minMed) reasons.push(`Need at least ${minMed} ${reasonLabel || 'logs'}`)
  let level: ConfidenceLevel = 'Med'
  if (count >= minHigh) level = 'High'
  if (count < minMed) level = 'Low'
  return { level, reasons }
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
