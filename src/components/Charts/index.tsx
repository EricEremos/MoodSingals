import { useEffect, useRef, useState } from 'react'
import type { VizSpec } from '../../data/insights'

function Sparkline({ values }: { values: number[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    let chart: { destroy: () => void } | null = null
    let mounted = true

    const render = async () => {
      if (!containerRef.current || values.length === 0) return
      try {
        const uPlot = (await import('uplot')).default
        const x = Float64Array.from(values.map((_, i) => i))
        const y = Float64Array.from(values)
        const data = [x, y]
        chart = new uPlot(
          {
            width: 220,
            height: 70,
            axes: [
              { show: false },
              { show: false },
            ],
            series: [{}, { stroke: '#ef6c3c', width: 2 }],
            padding: [6, 6, 6, 6],
          },
          data,
          containerRef.current,
        )
      } catch {
        if (mounted) setFallback(true)
      }
    }

    render()

    return () => {
      mounted = false
      if (chart) chart.destroy()
    }
  }, [values])

  if (fallback) {
    const max = Math.max(...values, 1)
    const points = values
      .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${100 - (v / max) * 100}`)
      .join(' ')
    return (
      <svg width="220" height="70" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline fill="none" stroke="#ef6c3c" strokeWidth="2" points={points} />
      </svg>
    )
  }

  return <div ref={containerRef} />
}

function BarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="inline-list">
      {labels.map((label, idx) => (
        <div key={label} style={{ minWidth: 64 }}>
          <div style={{ fontSize: 11, marginBottom: 6 }}>{label}</div>
          <div
            style={{
              height: 8,
              background: '#f2efe6',
              borderRadius: 999,
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(values[idx] / max) * 100}%`,
                borderRadius: 999,
                background: '#1b8a8f',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ labels, values }: { labels: string[]; values: number[] }) {
  const total = values.reduce((acc, v) => acc + v, 0) || 1
  const radius = 28
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <svg width="90" height="90" viewBox="0 0 100 100">
      {values.map((value, idx) => {
        const fraction = value / total
        const strokeDasharray = `${fraction * circumference} ${circumference}`
        const strokeDashoffset = offset
        offset -= fraction * circumference
        return (
          <circle
            key={labels[idx]}
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={idx === 0 ? '#1b8a8f' : '#ef6c3c'}
            strokeWidth="12"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        )
      })}
    </svg>
  )
}

function Heatmap({ xLabels, yLabels, values }: Extract<VizSpec, { type: 'heatmap' }>) {
  const flat = values.flat()
  const max = Math.max(...flat, 1)

  return (
    <div className="heatmap">
      {yLabels.map((rowLabel, rowIdx) => (
        <div key={rowLabel} className="heatmap-row">
          <div style={{ fontSize: 12, color: '#606a7a' }}>{rowLabel}</div>
          {xLabels.map((colLabel, colIdx) => {
            const value = values[rowIdx]?.[colIdx] || 0
            const intensity = value / max
            return (
              <div
                key={`${rowLabel}-${colLabel}`}
                className="heatmap-cell"
                style={{
                  background: `rgba(239, 108, 60, ${0.15 + intensity * 0.85})`,
                }}
                title={`${colLabel}: ${value.toFixed(0)}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function ChartMini({ spec }: { spec: VizSpec }) {
  if (spec.type === 'bar') {
    return <BarChart labels={spec.labels} values={spec.values} />
  }
  if (spec.type === 'donut') {
    return <DonutChart labels={spec.labels} values={spec.values} />
  }
  if (spec.type === 'heatmap') {
    return <Heatmap {...spec} />
  }
  if (spec.type === 'spark') {
    return <Sparkline values={spec.values} />
  }
  return null
}
