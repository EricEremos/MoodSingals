const STREAK_KEY = 'ms_daily_streak'
const STREAK_DATE_KEY = 'ms_daily_streak_date'

export function getDailyStreak() {
  return Number(localStorage.getItem(STREAK_KEY) || 0)
}

export function updateDailyStreak() {
  const today = new Date().toISOString().slice(0, 10)
  const lastDate = localStorage.getItem(STREAK_DATE_KEY)
  const current = getDailyStreak()

  if (!lastDate) {
    localStorage.setItem(STREAK_DATE_KEY, today)
    localStorage.setItem(STREAK_KEY, '1')
    return 1
  }

  if (lastDate === today) return current

  const last = new Date(lastDate)
  const diffDays = Math.floor((Date.parse(today) - last.getTime()) / (24 * 60 * 60 * 1000))
  const next = diffDays === 1 ? current + 1 : 1
  localStorage.setItem(STREAK_DATE_KEY, today)
  localStorage.setItem(STREAK_KEY, String(next))
  return next
}
