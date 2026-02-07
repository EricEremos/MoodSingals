import type { Confidence } from '../../data/insights/confidence'

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const level = confidence.level
  const className =
    level === 'High' ? 'badge badge-high' : level === 'Med' ? 'badge badge-med' : 'badge badge-low'

  return (
    <div
      className={className}
      title={`Confidence: ${level}. ${confidence.reasons.join(', ') || 'Confidence score'}`}
    >
      {level}
    </div>
  )
}
