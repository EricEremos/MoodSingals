import type { Confidence } from '../../data/insights/confidence'
import { copy } from '../../utils/copy'

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const level = confidence.level
  const className =
    level === 'High' ? 'badge badge-high' : level === 'Med' ? 'badge badge-med' : 'badge badge-low'

  return (
    <div
      className={className}
      title={copy.common.confidenceLevel[level]}
    >
      {level}
    </div>
  )
}
