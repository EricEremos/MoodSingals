import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { IndexResult } from '../../data/indices/types'
import ChartMini from '../Charts'
import ConfidenceBadge from '../ConfidenceBadge'

export default function InsightCard({ card }: { card: IndexResult }) {
  const isLow = card.confidence.level === 'Low'
  const confidenceHint = card.confidence.reasons.join(' • ') || 'Confidence score'
  const [tab, setTab] = useState<'details' | 'evidence'>('details')

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="insight-title">{card.spec.name}</h3>
        <ConfidenceBadge confidence={card.confidence} />
      </div>
      <p className="insight-line">{card.insight}</p>
      <ChartMini spec={card.vizSpec} />
      <div className="micro-action">
        <strong>Next:</strong> {card.microAction}
      </div>
      {card.gap ? (
        <div className="gap-panel">
          <div className="helper">{card.gap.message}</div>
          <Link className="button button-muted" to={card.gap.ctaHref}>
            {card.gap.ctaLabel}
          </Link>
        </div>
      ) : null}
      {isLow ? (
        <p className="helper" style={{ marginTop: 10 }}>
          Low confidence: {confidenceHint}.
        </p>
      ) : null}
      <div className="card-tabs">
        <button
          className={tab === 'details' ? 'tab-button tab-button-active' : 'tab-button'}
          onClick={() => setTab('details')}
          type="button"
        >
          Details
        </button>
        <button
          className={tab === 'evidence' ? 'tab-button tab-button-active' : 'tab-button'}
          onClick={() => setTab('evidence')}
          type="button"
        >
          Evidence &amp; limits
        </button>
      </div>
      {tab === 'details' ? (
        <div className="tab-panel">
          <p className="helper">{card.spec.user_question}</p>
          {card.detailsNote ? <p className="helper">{card.detailsNote}</p> : null}
          <div className="helper">Match: {card.spec.matching_rule}</div>
          <div className="helper">Formula: {card.spec.formula}</div>
          <div className="helper">Minimum data: {card.spec.minimum_data}</div>
          <div className="helper">Confidence: {card.spec.confidence.low} / {card.spec.confidence.medium} / {card.spec.confidence.high}</div>
        </div>
      ) : (
        <div className="tab-panel">
          <ul className="helper">
            {card.spec.citations.map((item) => (
              <li key={item.id}>
                {item.authors} ({item.year}) — {item.title}
              </li>
            ))}
            {card.spec.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
