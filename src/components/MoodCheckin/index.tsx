import { useMemo, useState } from 'react'
import { db, type MoodLog } from '../../data/db'
import { browserTimeZone, toISO } from '../../utils/dates'
import { MOODS, TAGS } from '../../data/insights/moods'
import { sha256 } from '../../utils/hash'

export default function MoodCheckin({
  onSaved,
}: {
  onSaved?: (mood: MoodLog) => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const tagOptions = useMemo(() => TAGS, [])

  const formatTag = (tag: string) =>
    tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const toneClass = (valence: number) => {
    if (valence >= 1) return 'mood-button-positive'
    if (valence <= -1) return 'mood-button-negative'
    return 'mood-button-neutral'
  }

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= 2) return prev
      return [...prev, tag]
    })
  }

  const saveMood = async (mood: (typeof MOODS)[number]) => {
    if (saving) return
    setSaving(true)
    try {
      const now = new Date()
      const id = await sha256(`${mood.label}-${now.toISOString()}`)
      const entry: MoodLog = {
        id,
        occurred_at: toISO(now),
        timezone: browserTimeZone,
        mood_label: mood.label,
        mood_emoji: mood.emoji,
        mood_valence: mood.valence,
        mood_arousal: mood.arousal,
        tags,
        note: note.trim() || undefined,
        created_at: toISO(new Date()),
      }
      await db.mood_logs.add(entry)
      onSaved?.(entry)
      setTags([])
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Mood check‑in</h2>
        </div>
        <div className="tag">10s</div>
      </div>
      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            className={`mood-button ${toneClass(mood.valence)}`}
            onClick={() => {
              saveMood(mood)
            }}
            disabled={saving}
          >
            <span style={{ fontSize: 20 }}>{mood.emoji}</span>
            <strong>{mood.label}</strong>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="helper">Tags</div>
        <div className="inline-list">
          {tagOptions.map((tag) => (
            <button
              key={tag}
              className={tags.includes(tag) ? 'button button-primary' : 'button'}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {formatTag(tag)}
            </button>
          ))}
        </div>
        <div className="helper">Max 2</div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="helper">Note (optional)</div>
        <input
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 140))}
          placeholder="Optional note"
        />
      </div>
    </div>
  )
}
