type ProgressBarProps = {
  label: string
  value: number
  max: number
  valueLabel?: string
}

export default function ProgressBar({ label, value, max, valueLabel }: ProgressBarProps) {
  const boundedMax = Math.max(max, 1)
  const boundedValue = Math.max(0, Math.min(value, boundedMax))
  const percent = (boundedValue / boundedMax) * 100

  return (
    <div className="progress-item">
      <div className="metric-row">
        <span>{label}</span>
        <strong>{valueLabel || `${boundedValue}/${boundedMax}`}</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={boundedMax} aria-valuenow={boundedValue} aria-label={label}>
        <span className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
