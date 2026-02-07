import type { MoodLog, Transaction, TxMoodAnnotation } from '../db'
import { sameLocalDay } from '../../utils/dates'

export type LinkedTransaction = Transaction & {
  linkedMood?: MoodLog
  linkConfidence?: 'Low' | 'Med' | 'High'
  linkSource?: 'DIRECT' | 'INFERRED'
}

const FORWARD_MS = 6 * 60 * 60 * 1000
const BACK_MS = 2 * 60 * 60 * 1000

export function linkTransactionsToMood(
  transactions: Transaction[],
  moodLogs: MoodLog[],
  annotations: TxMoodAnnotation[] = [],
): LinkedTransaction[] {
  const annotationMap = new Map<string, TxMoodAnnotation>()
  annotations.forEach((ann) => {
    annotationMap.set(ann.transaction_id, ann)
  })
  const sortedMoods = [...moodLogs].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )

  return transactions.map((tx) => {
    const txDate = new Date(tx.occurred_at)
    let candidate: MoodLog | undefined
    let confidence: LinkedTransaction['linkConfidence'] = undefined

    const direct = annotationMap.get(tx.id)
    if (direct) {
      return {
        ...tx,
        linkedMood: {
          id: direct.id,
          occurred_at: tx.occurred_at,
          timezone: tx.timezone,
          mood_label: direct.mood_label,
          mood_emoji: '',
          mood_valence: direct.valence,
          mood_arousal: direct.arousal,
          tags: direct.tags,
          note: direct.note,
          created_at: direct.created_at,
        },
        linkConfidence: 'High',
        linkSource: 'DIRECT',
      }
    }

    if (tx.mood_log_id) {
      const manual = sortedMoods.find((m) => m.id === tx.mood_log_id)
      if (manual) {
        return { ...tx, linkedMood: manual, linkConfidence: 'High', linkSource: 'DIRECT' }
      }
    }

    const targetTime = txDate.getTime()

    let closestDiff = Number.POSITIVE_INFINITY
    for (let i = 0; i < sortedMoods.length; i += 1) {
      const mood = sortedMoods[i]
      const moodDate = new Date(mood.occurred_at)
      const diff = targetTime - moodDate.getTime()
      const withinWindow = diff <= FORWARD_MS && diff >= -BACK_MS
      if (tx.time_unknown && !sameLocalDay(moodDate, txDate)) continue
      if (!tx.time_unknown && !withinWindow) continue

      const abs = Math.abs(diff)
      if (abs < closestDiff) {
        closestDiff = abs
        candidate = mood
      }
    }

    if (candidate) {
      const haystack = `${tx.category} ${tx.merchant} ${tx.description || ''}`.toLowerCase()
      const tagMatch = candidate.tags.some((tag) => haystack.includes(tag))
      confidence = tagMatch ? 'Med' : 'Low'
    }

    return { ...tx, linkedMood: candidate, linkConfidence: confidence, linkSource: candidate ? 'INFERRED' : undefined }
  })
}
