import { db, type ImportBatch, type MoodLog, type SpendMoment, type Transaction } from '../data/db'

export const SNAPSHOT_SCHEMA_VERSION = 1

export type LocalSnapshot = {
  schemaVersion: number
  exportedAt: string
  spend_moments: SpendMoment[]
  transactions: Transaction[]
  mood_logs: MoodLog[]
  imports: ImportBatch[]
}

export type LocalSnapshotStats = {
  spendMoments: number
  moodLogs: number
  transactions: number
  imports: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function exportLocalSnapshot(): Promise<LocalSnapshot> {
  const [transactions, moodLogs, imports, spendMoments] = await Promise.all([
    db.transactions.toArray(),
    db.mood_logs.toArray(),
    db.imports.toArray(),
    db.spend_moments.toArray(),
  ])

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    spend_moments: spendMoments,
    transactions,
    mood_logs: moodLogs,
    imports,
  }
}

export function getSnapshotStats(snapshot: LocalSnapshot): LocalSnapshotStats {
  return {
    spendMoments: snapshot.spend_moments.length,
    moodLogs: snapshot.mood_logs.length,
    transactions: snapshot.transactions.length,
    imports: snapshot.imports.length,
  }
}

export function isLocalSnapshot(value: unknown): value is LocalSnapshot {
  if (!isRecord(value)) return false

  return (
    typeof value.schemaVersion === 'number' &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.spend_moments) &&
    Array.isArray(value.transactions) &&
    Array.isArray(value.mood_logs) &&
    Array.isArray(value.imports)
  )
}

export async function restoreLocalSnapshot(snapshot: LocalSnapshot) {
  if (!isLocalSnapshot(snapshot)) {
    throw new Error('Backup payload is not a valid MoodSignals snapshot.')
  }

  await db.transaction(
    'rw',
    db.transactions,
    db.mood_logs,
    db.imports,
    db.spend_moments,
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.mood_logs.clear(),
        db.imports.clear(),
        db.spend_moments.clear(),
      ])

      await Promise.all([
        snapshot.transactions.length ? db.transactions.bulkPut(snapshot.transactions) : undefined,
        snapshot.mood_logs.length ? db.mood_logs.bulkPut(snapshot.mood_logs) : undefined,
        snapshot.imports.length ? db.imports.bulkPut(snapshot.imports) : undefined,
        snapshot.spend_moments.length ? db.spend_moments.bulkPut(snapshot.spend_moments) : undefined,
      ])
    },
  )
}
