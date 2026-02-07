import Dexie, { type Table } from 'dexie'

export type Transaction = {
  id: string
  occurred_at: string
  timezone: string
  amount: number
  merchant: string
  description: string
  category: string
  currency?: string
  outflow: number
  inflow: number
  time_unknown: boolean
  import_batch_id: string
  mood_log_id?: string
}

export type SpendMoment = {
  id: string
  created_at: string
  amount: number
  category: string
  mood_label: string
  valence: number
  arousal: number
  tags: string[]
  urge_level: 0 | 1 | 2
  note?: string
}

export type MoodLog = {
  id: string
  occurred_at: string
  timezone: string
  mood_label: string
  mood_emoji: string
  mood_valence: number
  mood_arousal: number
  tags: string[]
  note?: string
  created_at: string
}

export type ImportBatch = {
  id: string
  filename: string
  created_at: string
  row_count: number
  file_size_mb: number
  delimiter: string
  sign_convention: 'negative-outflow' | 'positive-outflow'
  parse_ms: number
  normalize_ms: number
  db_write_ms: number
  compute_ms: number
  time_unknown_pct: number
  mapping: Record<string, string | null>
}

class MoodSignalsDB extends Dexie {
  transactions!: Table<Transaction, string>
  spend_moments!: Table<SpendMoment, string>
  mood_logs!: Table<MoodLog, string>
  imports!: Table<ImportBatch, string>

  constructor() {
    super('mood-signals-db')
    this.version(1).stores({
      transactions: 'id, occurred_at, category, import_batch_id, mood_log_id',
      mood_logs: 'id, occurred_at, mood_label',
      imports: 'id, created_at',
    })
    this.version(2).stores({
      transactions: 'id, occurred_at, category, import_batch_id, mood_log_id',
      spend_moments: 'id, created_at, category, urge_level',
      mood_logs: 'id, occurred_at, mood_label',
      imports: 'id, created_at',
    })
  }
}

export const db = new MoodSignalsDB()
