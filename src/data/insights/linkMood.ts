import type { MoodLog, Transaction } from '../db'
import { sameLocalDay } from '../../utils/dates'

export type LinkedTransaction = Transaction & { linkedMood?: MoodLog }

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export function linkTransactionsToMood(
  transactions: Transaction[],
  moodLogs: MoodLog[],
): LinkedTransaction[] {
  const sortedMoods = [...moodLogs].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )

  return transactions.map((tx) => {
    const txDate = new Date(tx.occurred_at)
    let candidate: MoodLog | undefined

    for (let i = sortedMoods.length - 1; i >= 0; i -= 1) {
      const mood = sortedMoods[i]
      const moodDate = new Date(mood.occurred_at)
      if (moodDate.getTime() > txDate.getTime()) continue

      if (tx.time_unknown) {
        if (sameLocalDay(moodDate, txDate)) {
          candidate = mood
          break
        }
      } else {
        const diff = txDate.getTime() - moodDate.getTime()
        if (diff <= SIX_HOURS_MS) {
          candidate = mood
          break
        }
      }
    }

    return { ...tx, linkedMood: candidate }
  })
}
