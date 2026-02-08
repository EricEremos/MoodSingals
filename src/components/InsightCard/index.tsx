import { Link } from 'react-router-dom'
import type { IndexResult } from '../../data/indices/types'
import ChartMini from '../Charts'
import ConfidenceBadge from '../ConfidenceBadge'
import InfoSheet from '../InfoSheet'
import { copy } from '../../utils/copy'

export default function InsightCard({ card }: { card: IndexResult }) {
  const confidenceReasons = card.confidence.reasons.join(' • ')
  const confidenceHint =
    copy.common.confidenceLevel[card.confidence.level] || confidenceReasons

  return (
    <article className="card">
      <div className="card-header">
        <h3 className="card-title">{card.spec.name}</h3>
        <ConfidenceBadge confidence={card.confidence} />
      </div>

      <p className="insight-line">{card.insight}</p>
      <ChartMini spec={card.vizSpec} />

      <details className="collapse" style={{ marginTop: 12 }}>
        <summary>{copy.common.details}</summary>
        <div className="collapse-body">
          <p className="body-subtle">Next: {card.microAction}</p>
          {card.gap ? (
            <div className="gap-panel">
              <span className="body-subtle">{card.gap.message}</span>
              <Link className="button button-muted" to={card.gap.ctaHref}>
                {card.gap.ctaLabel}
              </Link>
            </div>
          ) : null}
          <InfoSheet title={copy.common.details}>
            <ul className="sheet-list">
              <li>Question: {card.spec.user_question}</li>
              <li>Rule: {card.spec.matching_rule}</li>
              <li>Formula: {card.spec.formula}</li>
              <li>Minimum data: {card.spec.minimum_data}</li>
              <li>Normalization: {card.spec.normalization}</li>
            </ul>
          </InfoSheet>
        </div>
      </details>

      <details className="collapse" style={{ marginTop: 12 }}>
        <summary>{copy.common.evidence}</summary>
        <div className="collapse-body">
          <p className="body-subtle">{confidenceHint}</p>
          {confidenceReasons && confidenceReasons !== confidenceHint ? (
            <p className="body-subtle">{confidenceReasons}</p>
          ) : null}
          <InfoSheet title="Evidence & limits">
            <ul className="sheet-list">
              {card.spec.citations.map((item) => (
                <li key={item.id}>
                  [{item.id}] {item.authors} ({item.year}) {item.title}
                </li>
              ))}
              {card.spec.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoSheet>
        </div>
      </details>
    </article>
  )
}
