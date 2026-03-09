import type { IndexSpec } from '../types'
import { validateIndexSpec } from '../types'
import { comfortSpendSpec } from './comfortSpend'
import { impulseRiskSpec } from './impulseRisk'
import { lateNightSpec } from './lateNight'
import { moodSpendHeatmapSpec } from './moodSpendHeatmap'
import { readinessSpec } from './readiness'
import { topTriggersSpec } from './topTriggers'
import { weeklyDriftSpec } from './weeklyDrift'
import { worthItAnchorsSpec } from './worthItAnchors'

export const INDEX_STANDARD_V1_SPECS: IndexSpec[] = [
  moodSpendHeatmapSpec,
  impulseRiskSpec,
  lateNightSpec,
  topTriggersSpec,
  comfortSpendSpec,
  worthItAnchorsSpec,
  weeklyDriftSpec,
  readinessSpec,
]

export function validateIndexStandardV1() {
  INDEX_STANDARD_V1_SPECS.forEach(validateIndexSpec)
}

validateIndexStandardV1()
