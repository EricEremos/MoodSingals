import type { InsightCardResult } from '../../data/insights'
import ChartMini from '../Charts'
import ConfidenceBadge from '../ConfidenceBadge'

export default function InsightCard({ card }: { card: InsightCardResult }) {
  const isLow = card.confidence.level === 'Low'
  const confidenceHint = card.confidence.reasons.join(' • ') || 'Confidence score'

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="insight-title">{card.title}</h3>
        <ConfidenceBadge confidence={card.confidence} />
      </div>
      <p className="insight-line">{card.insight}</p>
      <ChartMini spec={card.vizSpec} />
      <div className="micro-action">
        <strong>Next step:</strong> {card.microAction}
      </div>
      <p className="helper" style={{ marginTop: 10 }}>
        {isLow
          ? `Low confidence: ${confidenceHint}. Add more data to improve signal quality.`
          : confidenceHint}
      </p>
      <details className="accordion">
        <summary>How computed</summary>
        <p className="helper">{card.howComputed}</p>
      </details>
    </div>
  )
}
