import { useEffect, useRef, useState } from 'react'
import type { VizSpec } from '../../data/indices/viz'

function cssColor(token: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value || fallback
}

function Sparkline({ values }: { values: number[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fallback, setFallback] = useState(false)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    let chart: { destroy: () => void; setSize?: (size: { width: number; height: number }) => void } | null = null
    let mounted = true
    const wrap = wrapRef.current

    if (!wrap) return

    const render = async () => {
      if (!containerRef.current || values.length === 0) return
      try {
        const accent = cssColor('--primary', 'deepskyblue')
        const uPlot = (await import('uplot')).default
        const x = Float64Array.from(values.map((_, i) => i))
        const y = Float64Array.from(values)
        const data = [x, y]
        const width = wrap.clientWidth || 240
        const height = wrap.clientHeight || 120
        chart = new uPlot(
          {
            width,
            height,
            axes: [
              { show: false },
              { show: false },
            ],
            series: [{}, { stroke: accent, width: 2 }],
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

    const ro = new ResizeObserver(() => {
      if (!wrap) return
      const width = wrap.clientWidth
      const height = wrap.clientHeight
      if (width > 0 && height > 0) {
        setSize({ width, height })
        if (chart?.setSize) chart.setSize({ width, height })
      }
    })

    ro.observe(wrap)

    return () => {
      mounted = false
      ro.disconnect()
      if (chart) chart.destroy()
    }
  }, [values])

  if (fallback) {
    const accent = cssColor('--primary', 'deepskyblue')
    const max = Math.max(...values, 1)
    const points = values
      .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${100 - (v / max) * 100}`)
      .join(' ')
    return (
      <svg
        width={size.width || 240}
        height={size.height || 120}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline fill="none" stroke={accent} strokeWidth="2" points={points} />
      </svg>
    )
  }

  return (
    <div ref={wrapRef} className="chart-wrap">
      <div ref={containerRef} className="chart-inner" />
    </div>
  )
}

function BarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const surface = cssColor('--surface-3', 'slategray')
  const accent = cssColor('--primary', 'deepskyblue')
  const max = Math.max(...values, 1)
  return (
    <div className="inline-list">
      {labels.map((label, idx) => (
        <div key={label} style={{ minWidth: 64 }}>
          <div style={{ fontSize: 11, marginBottom: 6 }}>{label}</div>
          <div
            style={{
              height: 8,
              background: surface,
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
                background: accent,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ labels, values }: { labels: string[]; values: number[] }) {
  const accent = cssColor('--primary', 'deepskyblue')
  const accent2 = cssColor('--primary-2', 'mediumpurple')
  const total = values.reduce((acc, v) => acc + v, 0) || 1
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offsets = values.reduce<number[]>((acc, value) => {
    const fraction = value / total
    const previous = acc.length ? acc[acc.length - 1] : 0
    acc.push(previous - fraction * circumference)
    return acc
  }, [])

  return (
    <svg width="90" height="90" viewBox="0 0 100 100">
      {values.map((value, idx) => {
        const fraction = value / total
        const strokeDasharray = `${fraction * circumference} ${circumference}`
        const strokeDashoffset = idx === 0 ? 0 : offsets[idx - 1]
        return (
          <circle
            key={labels[idx]}
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={idx === 0 ? accent : accent2}
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
  const textMuted = cssColor('--text-2', 'lightslategray')
  const flat = values.flat()
  const max = Math.max(...flat, 1)

  return (
    <div className="heatmap">
      {yLabels.map((rowLabel, rowIdx) => (
        <div key={rowLabel} className="heatmap-row">
          <div style={{ fontSize: 12, color: textMuted }}>{rowLabel}</div>
          {xLabels.map((colLabel, colIdx) => {
            const value = values[rowIdx]?.[colIdx] || 0
            const intensity = value / max
            return (
              <div
                key={`${rowLabel}-${colLabel}`}
                className="heatmap-cell"
                style={{
                  background: `rgb(var(--rgb-primary) / ${0.15 + intensity * 0.85})`,
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
