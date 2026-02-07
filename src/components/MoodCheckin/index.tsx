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

  const remaining = 140 - note.length

  const tagOptions = useMemo(() => TAGS, [])

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
          <h2 className="section-title">Mood Check-in</h2>
          <p className="section-subtitle">Quick mood log.</p>
        </div>
        <div className="tag">10 seconds</div>
      </div>
      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            className="mood-button"
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
        <div className="helper">Tags (max 2)</div>
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

      <div style={{ marginTop: 20 }}>
        <div className="helper">Note (140 max)</div>
        <input
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 140))}
          placeholder="What’s on your mind?"
        />
        <div className="helper">{remaining} characters left</div>
      </div>
    </div>
  )
}
