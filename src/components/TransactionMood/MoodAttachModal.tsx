import { useMemo, useState } from 'react'
import { db, type Transaction, type TxMoodAnnotation } from '../../data/db'
import { MOODS, TAGS } from '../../data/insights/moods'
import { sha256 } from '../../utils/hash'
import { toISO } from '../../utils/dates'

export default function MoodAttachModal({
  transaction,
  existing,
  onClose,
  onSaved,
}: {
  transaction: Transaction
  existing?: TxMoodAnnotation | null
  onClose: () => void
  onSaved: () => void
}) {
  const [mood, setMood] = useState(existing?.mood_label || '')
  const [tags, setTags] = useState<string[]>(existing?.tags || [])
  const [memory, setMemory] = useState<TxMoodAnnotation['memory_confidence']>(
    existing?.memory_confidence || undefined,
  )
  const [note, setNote] = useState(existing?.note || '')
  const [saving, setSaving] = useState(false)

  const selectedMood = useMemo(() => MOODS.find((m) => m.label === mood), [mood])
  const tagOptions = useMemo(() => TAGS, [])

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 2) return prev
      return [...prev, tag]
    })
  }

  const save = async () => {
    if (!selectedMood || saving) return
    setSaving(true)
    const id = existing?.id || (await sha256(`tx-annotation-${transaction.id}`))
    const entry: TxMoodAnnotation = {
      id,
      transaction_id: transaction.id,
      created_at: existing?.created_at || toISO(new Date()),
      mood_label: selectedMood.label,
      valence: selectedMood.valence,
      arousal: selectedMood.arousal,
      tags,
      memory_confidence: memory,
      note: note.trim() || undefined,
    }
    await db.tx_mood_annotations.put(entry)
    setSaving(false)
    onSaved()
  }

  const remove = async () => {
    if (!existing) return
    await db.tx_mood_annotations.delete(existing.id)
    onSaved()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="insight-title">Add mood</h3>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-content">
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{transaction.merchant || transaction.description}</div>
            <div className="helper">
              {new Date(transaction.occurred_at).toLocaleDateString()} • {transaction.category}
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
              {tagOptions.map((tag) => (
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
          <div>
            <div className="helper">Memory confidence</div>
            <div className="inline-list">
              {[
                { label: 'Sure', value: 'high' },
                { label: 'Maybe', value: 'medium' },
                { label: 'Not sure', value: 'low' },
              ].map((item) => (
                <button
                  key={item.value}
                  className={memory === item.value ? 'button button-primary' : 'button'}
                  onClick={() => setMemory(item.value as TxMoodAnnotation['memory_confidence'])}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="helper">Note (optional)</div>
            <input
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 120))}
              placeholder="Optional note"
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }} className="inline-list">
          <button className="button button-primary" onClick={save} disabled={!selectedMood || saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {existing ? (
            <button className="button button-muted" onClick={remove} type="button">
              Remove
            </button>
          ) : null}
          <button className="button" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
