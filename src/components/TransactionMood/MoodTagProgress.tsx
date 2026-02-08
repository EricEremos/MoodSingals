import { Link } from 'react-router-dom'

export default function MoodTagProgress({ taggedCount }: { taggedCount: number }) {
  const target = 5
  const clamped = Math.min(taggedCount, target)
  const progress = Math.round((clamped / target) * 100)

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="inline-list" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <div className="helper">Mood-tagged purchases: {taggedCount}</div>
          <div className="helper">Tag 5 to unlock stronger insights.</div>
        </div>
        <Link className="button button-muted" to="/timeline">
          Tag purchases
        </Link>
      </div>
      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'var(--surface2)' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 999,
            background: 'var(--accent)',
            transition: 'width 180ms ease',
          }}
        />
      </div>
    </div>
  )
}
