import { Link } from 'react-router-dom'
import type { IndexResult } from '../../data/indices/types'
import ChartMini from '../Charts'
import ConfidenceBadge from '../ConfidenceBadge'
import InfoSheet from '../InfoSheet'
import { Card, Disclosure } from '../ui'
import { copy } from '../../utils/copy'

export default function InsightCard({ card }: { card: IndexResult }) {
  const confidenceReasons = card.confidence.reasons.join(' • ')
  const confidenceHint =
    copy.common.confidenceLevel[card.confidence.level] || confidenceReasons

  return (
    <Card as="article">
      <div className="card-header">
        <h3 className="card-title">{card.spec.name}</h3>
        <ConfidenceBadge confidence={card.confidence} />
      </div>

      <p className="insight-line">{card.insight}</p>
      <ChartMini spec={card.vizSpec} />

      <Disclosure title={copy.common.details} className="insight-disclosure">
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
              <li>Question this card answers: {card.spec.user_question}</li>
              <li>How events are matched: {card.spec.matching_rule}</li>
              <li>How the score is estimated: {card.spec.formula}</li>
              <li>Data needed: {card.spec.minimum_data}</li>
              <li>Adjustment rule: {card.spec.normalization}</li>
            </ul>
          </InfoSheet>
      </Disclosure>

      <Disclosure title={copy.common.evidence} className="insight-disclosure">
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
      </Disclosure>
    </Card>
  )
}
