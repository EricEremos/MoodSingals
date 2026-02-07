export default function MoodPill({
  label,
  tags,
}: {
  label: string
  tags?: string[]
}) {
  const tagText = tags && tags.length ? ` • ${tags.slice(0, 2).join(' • ')}` : ''
  return <span className="mood-pill">{label}{tagText}</span>
}
