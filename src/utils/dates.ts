export const browserTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function parseDateValue(value: string): { date: Date | null; timeUnknown: boolean } {
  if (!value) return { date: null, timeUnknown: true }
  const trimmed = value.trim()
  const hasTime = /\d{1,2}:\d{2}/.test(trimmed) || /T\d{2}:\d{2}/.test(trimmed)
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return { date: null, timeUnknown: !hasTime }
  }
  return { date: parsed, timeUnknown: !hasTime }
}

export function formatLocalDate(iso: string) {
  const date = new Date(iso)
  return date.toLocaleString()
}

export function toISO(date: Date) {
  return date.toISOString()
}

export function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
