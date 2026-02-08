import type { InsightContext } from './index'

const DIRECT_ONLY_MIN = 10

export function selectMoodLinkedTransactions(context: InsightContext) {
  const direct = context.directLinkedTransactions.filter((tx) => tx.linkedMood)
  if (direct.length >= DIRECT_ONLY_MIN) {
    return { linked: direct, usesInferred: false }
  }
  const inferred = context.inferredLinkedTransactions.filter((tx) => tx.linkedMood)
  return { linked: [...direct, ...inferred], usesInferred: inferred.length > 0 }
}

export function directLinkDetailsNote(usesInferred: boolean) {
  if (!usesInferred) return 'Using DIRECT mood-tagged purchases.'
  return 'Using DIRECT mood tags with INFERRED time-window links as fallback.'
}

export function moodTagUnlockGap(directCount: number) {
  if (directCount >= 5) return undefined
  return {
    message: 'Tag 5 purchases with a mood to unlock this insight.',
    ctaLabel: 'Tag purchases',
    ctaHref: '/timeline',
  }
}
