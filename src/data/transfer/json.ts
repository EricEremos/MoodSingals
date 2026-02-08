import {
  db,
  type ImportBatch,
  type MoodLog,
  type SpendMoment,
  type Transaction,
  type TxMoodAnnotation,
} from '../db'

const SNAPSHOT_FORMAT = 'moodsignals-local-v1'

const PREFERENCE_KEYS = [
  'ms_demo',
  'ms_research_mode',
  'ms_anon_metrics',
  'ms_reflection_done',
] as const

type PreferenceKey = (typeof PREFERENCE_KEYS)[number]

export type LocalSnapshot = {
  format: typeof SNAPSHOT_FORMAT
  exported_at: string
  transactions: Transaction[]
  tx_mood_annotations: TxMoodAnnotation[]
  mood_logs: MoodLog[]
  spend_moments: SpendMoment[]
  imports: ImportBatch[]
  preferences: Record<PreferenceKey, string | null>
}

export type ImportSnapshotResult = {
  transactions: number
  annotations: number
  moods: number
  spends: number
  imports: number
}

function readPreferences(): Record<PreferenceKey, string | null> {
  return {
    ms_demo: localStorage.getItem('ms_demo'),
    ms_research_mode: localStorage.getItem('ms_research_mode'),
    ms_anon_metrics: localStorage.getItem('ms_anon_metrics'),
    ms_reflection_done: localStorage.getItem('ms_reflection_done'),
  }
}

function applyPreferences(preferences: Partial<Record<PreferenceKey, string | null>>) {
  for (const key of PREFERENCE_KEYS) {
    const value = preferences[key]
    if (value === undefined) continue
    if (value === null) {
      localStorage.removeItem(key)
      continue
    }
    localStorage.setItem(key, value)
  }
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeSnapshot(raw: unknown): LocalSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON file.')
  }

  const payload = raw as Record<string, unknown>
  const preferencesRaw = payload.preferences
  const safePreferences = readPreferences()

  if (preferencesRaw && typeof preferencesRaw === 'object' && !Array.isArray(preferencesRaw)) {
    for (const key of PREFERENCE_KEYS) {
      const value = (preferencesRaw as Record<string, unknown>)[key]
      if (typeof value === 'string' || value === null) {
        safePreferences[key] = value
      }
    }
  }

  return {
    format: SNAPSHOT_FORMAT,
    exported_at:
      typeof payload.exported_at === 'string' ? payload.exported_at : new Date().toISOString(),
    transactions: toArray<Transaction>(payload.transactions),
    tx_mood_annotations: toArray<TxMoodAnnotation>(payload.tx_mood_annotations),
    mood_logs: toArray<MoodLog>(payload.mood_logs),
    spend_moments: toArray<SpendMoment>(payload.spend_moments),
    imports: toArray<ImportBatch>(payload.imports),
    preferences: {
      ms_demo: safePreferences.ms_demo,
      ms_research_mode: safePreferences.ms_research_mode,
      ms_anon_metrics: safePreferences.ms_anon_metrics,
      ms_reflection_done: safePreferences.ms_reflection_done,
    },
  }
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function createLocalSnapshot(): Promise<LocalSnapshot> {
  const [transactions, annotations, moods, spends, imports] = await Promise.all([
    db.transactions.toArray(),
    db.tx_mood_annotations.toArray(),
    db.mood_logs.toArray(),
    db.spend_moments.toArray(),
    db.imports.toArray(),
  ])

  return {
    format: SNAPSHOT_FORMAT,
    exported_at: new Date().toISOString(),
    transactions,
    tx_mood_annotations: annotations,
    mood_logs: moods,
    spend_moments: spends,
    imports,
    preferences: readPreferences(),
  }
}

export async function exportJsonSnapshot(filename = 'moodsignals-data.json') {
  const snapshot = await createLocalSnapshot()
  downloadText(filename, JSON.stringify(snapshot, null, 2), 'application/json')
  return snapshot
}

export async function importJsonSnapshot(file: File, options: { replace?: boolean } = {}) {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  const snapshot = normalizeSnapshot(parsed)
  const shouldReplace = options.replace === true

  await db.transaction(
    'rw',
    [db.transactions, db.tx_mood_annotations, db.mood_logs, db.spend_moments, db.imports],
    async () => {
      if (shouldReplace) {
        await Promise.all([
          db.transactions.clear(),
          db.tx_mood_annotations.clear(),
          db.mood_logs.clear(),
          db.spend_moments.clear(),
          db.imports.clear(),
        ])
      }

      if (snapshot.transactions.length) await db.transactions.bulkPut(snapshot.transactions)
      if (snapshot.tx_mood_annotations.length)
        await db.tx_mood_annotations.bulkPut(snapshot.tx_mood_annotations)
      if (snapshot.mood_logs.length) await db.mood_logs.bulkPut(snapshot.mood_logs)
      if (snapshot.spend_moments.length) await db.spend_moments.bulkPut(snapshot.spend_moments)
      if (snapshot.imports.length) await db.imports.bulkPut(snapshot.imports)
    },
  )

  applyPreferences(snapshot.preferences)

  const result: ImportSnapshotResult = {
    transactions: snapshot.transactions.length,
    annotations: snapshot.tx_mood_annotations.length,
    moods: snapshot.mood_logs.length,
    spends: snapshot.spend_moments.length,
    imports: snapshot.imports.length,
  }

  return result
}
