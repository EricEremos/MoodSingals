import { useState } from 'react'
import type { InsightCardResult } from '../../data/insights'
import ChartMini from '../Charts'
import ConfidenceBadge from '../ConfidenceBadge'

export default function InsightCard({ card }: { card: InsightCardResult }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="insight-title">{card.title}</h3>
        <ConfidenceBadge confidence={card.confidence} />
      </div>
      <p className="insight-line">{card.insight}</p>
      <ChartMini spec={card.vizSpec} />
      <div className="micro-action">{card.microAction}</div>
      <div className="accordion">
        <button className="button button-muted" onClick={() => setOpen((v) => !v)}>
          How computed
        </button>
        {open ? <p className="helper">{card.howComputed}</p> : null}
      </div>
    </div>
  )
}
