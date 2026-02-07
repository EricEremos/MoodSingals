import { db, type ImportBatch, type MoodLog, type Transaction } from './db'
import { MOODS } from './insights/moods'
import { browserTimeZone, toISO } from '../utils/dates'
import { sha256 } from '../utils/hash'

const SAMPLE_IMPORT_ID = 'sample-import'

function pick<T>(list: T[], idx: number) {
  return list[idx % list.length]
}

export async function loadSampleData() {
  const now = new Date()
  const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const moodLogs: MoodLog[] = []
  const transactions: Transaction[] = []

  const merchants = [
    'Metro Market',
    'Bright Coffee',
    'City Transit',
    'Zen Gym',
    'Skyline Pharmacy',
    'CloudStream',
    'Office Depot',
    'Green Grocer',
    'Civic Energy',
    'Weekend Bistro',
  ]
  const categories = [
    'Groceries',
    'Dining',
    'Transit',
    'Health',
    'Subscriptions',
    'Work',
    'Utilities',
    'Shopping',
  ]

  for (let day = 0; day < 14; day += 1) {
    const mood = pick(MOODS, day + 3)
    const moodTime = new Date(start.getTime() + day * 24 * 60 * 60 * 1000)
    moodTime.setHours(9, 0, 0, 0)
    const moodId = await sha256(`sample-mood-${day}-${mood.label}`)
    moodLogs.push({
      id: moodId,
      occurred_at: toISO(moodTime),
      timezone: browserTimeZone,
      mood_label: mood.label,
      mood_emoji: mood.emoji,
      mood_valence: mood.valence,
      mood_arousal: mood.arousal,
      tags: [],
      note: 'Sample mood check-in',
      created_at: toISO(new Date()),
    })

    for (let tx = 0; tx < 5; tx += 1) {
      const txTime = new Date(moodTime.getTime() + (tx + 1) * 60 * 60 * 1000)
      const amount = Number((Math.random() * 65 + 5).toFixed(2))
      const outflow = amount
      const inflow = 0
      const txId = await sha256(`sample-tx-${day}-${tx}-${txTime.toISOString()}`)
      transactions.push({
        id: txId,
        occurred_at: toISO(txTime),
        timezone: browserTimeZone,
        amount: -outflow,
        merchant: pick(merchants, day + tx),
        description: 'Sample transaction',
        category: pick(categories, day + tx),
        currency: 'USD',
        outflow,
        inflow,
        time_unknown: false,
        import_batch_id: SAMPLE_IMPORT_ID,
        mood_log_id: moodId,
      })
    }
  }

  await db.mood_logs.bulkPut(moodLogs)
  await db.transactions.bulkPut(transactions)

  const importBatch: ImportBatch = {
    id: SAMPLE_IMPORT_ID,
    filename: 'sample-data.csv',
    created_at: toISO(new Date()),
    row_count: transactions.length,
    file_size_mb: 0.02,
    delimiter: ',',
    sign_convention: 'negative-outflow',
    parse_ms: 0,
    normalize_ms: 0,
    db_write_ms: 0,
    compute_ms: 0,
    time_unknown_pct: 0,
    mapping: {
      date: 'occurred_at',
      amount: 'outflow',
      merchant: 'merchant',
      description: 'description',
      category: 'category',
      currency: 'currency',
    },
  }

  const existing = await db.imports.get(SAMPLE_IMPORT_ID)
  if (!existing) {
    await db.imports.add(importBatch)
  }
}
