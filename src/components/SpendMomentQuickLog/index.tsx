import { useMemo, useState } from 'react'
import { db, type SpendMoment } from '../../data/db'
import { MOODS, TAGS } from '../../data/insights/moods'
import { toISO } from '../../utils/dates'
import { sha256 } from '../../utils/hash'

const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Health',
  'Shopping',
  'Bills',
  'Subscriptions',
  'Work',
  'Other',
]

const QUICK_MOODS = MOODS.slice(0, 10)

export default function SpendMomentQuickLog({
  onSaved,
  compact,
}: {
  onSaved?: (moment: SpendMoment) => void
  compact?: boolean
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [tags, setTags] = useState<string[]>([])
  const [mood, setMood] = useState(QUICK_MOODS[0])
  const [urge, setUrge] = useState<0 | 1 | 2>(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [undoId, setUndoId] = useState<string | null>(null)

  const tagOptions = useMemo(() => TAGS, [])

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 2) return prev
      return [...prev, tag]
    })
  }

  const parseAmount = () => {
    const cleaned = amount.replace(/[^0-9.]/g, '')
    return Number.parseFloat(cleaned)
  }

  const save = async () => {
    if (saving) return
    const parsed = parseAmount()
    if (!parsed || Number.isNaN(parsed)) return
    setSaving(true)
    try {
      const now = new Date()
      const id = await sha256(`spend-${now.toISOString()}-${parsed}`)
      const entry: SpendMoment = {
        id,
        created_at: toISO(now),
        amount: parsed,
        category,
        mood_label: mood.label,
        valence: mood.valence,
        arousal: mood.arousal,
        tags,
        urge_level: urge,
        note: note.trim() || undefined,
      }
      await db.spend_moments.add(entry)
      onSaved?.(entry)
      setAmount('')
      setTags([])
      setNote('')
      setUrge(0)
      setUndoId(id)
      setTimeout(() => setUndoId((prev) => (prev === id ? null : prev)), 5000)
    } finally {
      setSaving(false)
    }
  }

  const undo = async () => {
    if (!undoId) return
    await db.spend_moments.delete(undoId)
    setUndoId(null)
  }

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Spend Moment</h2>
          <p className="section-subtitle">10 seconds. One tap save.</p>
        </div>
        <div className="tag">Primary</div>
      </div>

      <div className="grid grid-2">
        <div>
          <label className="helper">Amount</label>
          <input
            className="input"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="$12"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="helper">Category</label>
          <div className="inline-list">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={cat === category ? 'button button-primary' : 'button'}
                type="button"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="helper">Mood at the moment</label>
        <div className="mood-grid">
          {QUICK_MOODS.map((option) => (
            <button
              key={option.label}
              className={option.label === mood.label ? 'mood-button mood-button-active' : 'mood-button'}
              onClick={() => setMood(option)}
              type="button"
            >
              <span style={{ fontSize: 20 }}>{option.emoji}</span>
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="helper">Urge level (optional)</label>
        <div className="inline-list">
          {[0, 1, 2].map((level) => (
            <button
              key={level}
              className={urge === level ? 'button button-primary' : 'button'}
              onClick={() => setUrge(level as 0 | 1 | 2)}
              type="button"
            >
              {level === 0 ? 'Low' : level === 1 ? 'Medium' : 'High'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="helper">Context tags (optional)</label>
        <div className="inline-list">
          {tagOptions.map((tag) => (
            <button
              key={tag}
              className={tags.includes(tag) ? 'button button-primary' : 'button'}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {!compact ? (
        <div style={{ marginTop: 16 }}>
          <label className="helper">Note (optional)</label>
          <input
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 140))}
            placeholder="Short note"
          />
        </div>
      ) : null}

      <div style={{ marginTop: 16 }} className="inline-list">
        <button className="button button-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save spend moment'}
        </button>
        {undoId ? (
          <button className="button button-muted" onClick={undo} type="button">
            Undo
          </button>
        ) : null}
      </div>
    </div>
  )
}
