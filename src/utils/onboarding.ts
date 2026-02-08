export const ONBOARDING_SUPPRESSED_UNTIL_KEY = 'onboarding_suppressed_until'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function getSuppressedUntilMs(): number | null {
  const raw = localStorage.getItem(ONBOARDING_SUPPRESSED_UNTIL_KEY)
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  return parsed
}

export function shouldAutoShowOnboarding(now = Date.now()) {
  const suppressedUntil = getSuppressedUntilMs()
  if (!suppressedUntil) return true
  return now >= suppressedUntil
}

export function suppressOnboardingFor30Days(now = Date.now()) {
  const suppressedUntil = new Date(now + THIRTY_DAYS_MS).toISOString()
  localStorage.setItem(ONBOARDING_SUPPRESSED_UNTIL_KEY, suppressedUntil)
}

export function clearOnboardingSuppression() {
  localStorage.removeItem(ONBOARDING_SUPPRESSED_UNTIL_KEY)
}
