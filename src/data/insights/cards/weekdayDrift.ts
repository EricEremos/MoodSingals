import type { IndexResult } from '../../indices/types'
import type { InsightContext } from '../index'
import { weeklyDriftSpec } from '../../indices/specs/weeklyDrift'
import { directConfidence } from '../confidence'

const weekKey = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function weeklyDriftCard(context: InsightContext): IndexResult {
  const moodByWeek: Record<string, number[]> = {}
  const spendByWeek: Record<string, number[]> = {}

  context.moodLogs.forEach((mood) => {
    const key = weekKey(new Date(mood.occurred_at))
    moodByWeek[key] = moodByWeek[key] || []
    moodByWeek[key].push(mood.mood_valence)
  })

  context.spendMoments.forEach((moment) => {
    const key = weekKey(new Date(moment.created_at))
    spendByWeek[key] = spendByWeek[key] || []
    spendByWeek[key].push(moment.amount)
  })

  context.linkedTransactions.forEach((tx) => {
    const key = weekKey(new Date(tx.occurred_at))
    spendByWeek[key] = spendByWeek[key] || []
    spendByWeek[key].push(tx.outflow > 0 ? tx.outflow : 0)
  })

  const weeks = Object.keys(moodByWeek).filter((key) => spendByWeek[key])
  const moodVar = weeks.map((key) => variance(moodByWeek[key]))
  const spendVar = weeks.map((key) => variance(spendByWeek[key]))
  const corr = correlation(moodVar, spendVar)

  const confidence = directConfidence(context.directCount)
  if (weeks.length < 4) confidence.reasons.push('Need 4 weeks of data')

  return {
    spec: weeklyDriftSpec,
    insight:
      weeks.length >= 4
        ? `Weekly mood vs spend volatility: ${corr.toFixed(2)}.`
        : 'Not enough weekly data yet.',
    data: { weeks, moodVar, spendVar, corr },
    detailsNote: 'Weekly aggregates of mood and spend.',
    vizSpec: {
      type: 'spark',
      values: spendVar.length ? spendVar : [0, 0, 0, 0],
    },
    microAction: 'Try one stabilizing habit this week.',
    confidence,
    relevance: 0.6,
    gap:
      weeks.length < 4
        ? { message: 'Need 4 weeks of data.', ctaLabel: 'Keep logging', ctaHref: '/today' }
        : undefined,
  }
}

function variance(values: number[]) {
  if (!values.length) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
}

function correlation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length === 0) return 0
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < x.length; i += 1) {
    const vx = x[i] - mx
    const vy = y[i] - my
    num += vx * vy
    dx += vx * vx
    dy += vy * vy
  }
  const denom = Math.sqrt(dx * dy)
  return denom ? num / denom : 0
}
