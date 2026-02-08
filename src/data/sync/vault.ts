import { db, type MoodLog, type SpendMoment, type Transaction, type TxMoodAnnotation } from '../db'

export type VaultSnapshot = {
  schema_version: number
  exported_at: string
  transactions: Transaction[]
  tx_mood_annotations: TxMoodAnnotation[]
  mood_logs: MoodLog[]
  spend_moments: SpendMoment[]
  preferences: Record<string, string | null>
}

export async function exportVaultSnapshot(): Promise<VaultSnapshot> {
  const [transactions, txMoodAnnotations, moodLogs, spendMoments] = await Promise.all([
    db.transactions.toArray(),
    db.tx_mood_annotations.toArray(),
    db.mood_logs.toArray(),
    db.spend_moments.toArray(),
  ])

  const preferences: Record<string, string | null> = {
    ms_demo: localStorage.getItem('ms_demo'),
    ms_research_mode: localStorage.getItem('ms_research_mode'),
    ms_anon_metrics: localStorage.getItem('ms_anon_metrics'),
    ms_reflection_done: localStorage.getItem('ms_reflection_done'),
  }

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    transactions,
    tx_mood_annotations: txMoodAnnotations,
    mood_logs: moodLogs,
    spend_moments: spendMoments,
    preferences,
  }
}

function mergeById<T extends { id: string }>(
  localRows: T[],
  remoteRows: T[],
  pickNewest: (row: T) => number,
): T[] {
  const map = new Map<string, T>()
  localRows.forEach((row) => map.set(row.id, row))
  remoteRows.forEach((row) => {
    const existing = map.get(row.id)
    if (!existing) {
      map.set(row.id, row)
      return
    }
    if (pickNewest(row) > pickNewest(existing)) {
      map.set(row.id, row)
    }
  })
  return Array.from(map.values())
}

export function mergeVaultSnapshots(local: VaultSnapshot, remote: VaultSnapshot): VaultSnapshot {
  return {
    schema_version: Math.max(local.schema_version, remote.schema_version),
    exported_at: new Date().toISOString(),
    transactions: mergeById(local.transactions, remote.transactions, (row) =>
      new Date(row.occurred_at).getTime(),
    ),
    tx_mood_annotations: mergeById(
      local.tx_mood_annotations,
      remote.tx_mood_annotations,
      (row) => new Date(row.created_at).getTime(),
    ),
    mood_logs: mergeById(local.mood_logs, remote.mood_logs, (row) =>
      new Date(row.created_at).getTime(),
    ),
    spend_moments: mergeById(local.spend_moments, remote.spend_moments, (row) =>
      new Date(row.created_at).getTime(),
    ),
    preferences: { ...remote.preferences, ...local.preferences },
  }
}

export async function importVaultSnapshot(snapshot: VaultSnapshot, merge = true) {
  if (!merge) {
    await Promise.all([
      db.transactions.clear(),
      db.tx_mood_annotations.clear(),
      db.mood_logs.clear(),
      db.spend_moments.clear(),
    ])
  }

  await db.transaction(
    'rw',
    db.transactions,
    db.tx_mood_annotations,
    db.mood_logs,
    db.spend_moments,
    async () => {
      await db.transactions.bulkPut(snapshot.transactions)
      await db.tx_mood_annotations.bulkPut(snapshot.tx_mood_annotations)
      await db.mood_logs.bulkPut(snapshot.mood_logs)
      await db.spend_moments.bulkPut(snapshot.spend_moments)
    },
  )

  Object.entries(snapshot.preferences).forEach(([key, value]) => {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  })
}
