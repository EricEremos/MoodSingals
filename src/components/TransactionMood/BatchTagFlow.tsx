import { useMemo, useState } from 'react'
import { db, type Transaction, type TxMoodAnnotation } from '../../data/db'
import { MOODS, TAGS } from '../../data/insights/moods'
import { sha256 } from '../../utils/hash'
import { toISO } from '../../utils/dates'

export default function BatchTagFlow({
  transactions,
  existing,
  onClose,
  onDone,
  targetCount = 5,
}: {
  transactions: Transaction[]
  existing: Record<string, TxMoodAnnotation>
  onClose: () => void
  onDone: () => void
  targetCount?: number
}) {
  const pending = useMemo(
    () => transactions.filter((tx) => !existing[tx.id]).slice(0, Math.max(targetCount, 5)),
    [transactions, existing, targetCount],
  )
  const [index, setIndex] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [mood, setMood] = useState<string>('')

  const current = pending[index]

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 2) return prev
      return [...prev, tag]
    })
  }

  const save = async () => {
    if (!current || !mood) return
    const moodOption = MOODS.find((m) => m.label === mood)
    if (!moodOption) return
    const entry: TxMoodAnnotation = {
      id: await sha256(`tx-annotation-${current.id}`),
      transaction_id: current.id,
      created_at: toISO(new Date()),
      mood_label: moodOption.label,
      valence: moodOption.valence,
      arousal: moodOption.arousal,
      tags,
      memory_confidence: 'medium',
    }
    await db.tx_mood_annotations.put(entry)
    next()
  }

  const next = () => {
    setMood('')
    setTags([])
    if (index + 1 >= pending.length) {
      onDone()
    } else {
      setIndex(index + 1)
    }
  }

  if (!current) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div className="modal">
          <div className="modal-header">
            <h3 className="insight-title">Tag purchases</h3>
            <button className="button button-ghost" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="modal-content">
            <p className="helper">All recent purchases are tagged.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="insight-title">Tag purchases</h3>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-content">
          <div className="helper">
            {index + 1} / {Math.min(targetCount, pending.length)} tagged
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{current.merchant || current.description}</div>
            <div className="helper">
              {new Date(current.occurred_at).toLocaleDateString()} • {current.category}
            </div>
            <div className="helper">
              {current.outflow > 0 ? `-${current.outflow.toFixed(2)}` : current.inflow.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="helper">Mood</div>
            <div className="mood-grid">
              {MOODS.map((option) => (
                <button
                  key={option.label}
                  className={`mood-button ${mood === option.label ? 'mood-button-active' : ''}`}
                  onClick={() => setMood(option.label)}
                  type="button"
                >
                  <span style={{ fontSize: 20 }}>{option.emoji}</span>
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="helper">Tags</div>
            <div className="inline-list">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  className={tags.includes(tag) ? 'button button-primary' : 'button'}
                  onClick={() => toggleTag(tag)}
                  type="button"
                >
                  {tag.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
            <div className="helper">Max 2</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }} className="inline-list">
          <button className="button button-primary" onClick={save} disabled={!mood}>
            Save &amp; next
          </button>
          <button className="button" onClick={next} type="button">
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
