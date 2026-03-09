import { db } from '../db'

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return ''
  const text =
    typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function serializeRows(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 'id\n'
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key))
      return acc
    }, new Set()),
  )
  const lines = [headers.join(',')]
  for (const row of rows) {
    const line = headers.map((header) => escapeCsvValue(row[header])).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportCsvSnapshots() {
  const [transactions, moods, spends] = await Promise.all([
    db.transactions.toArray(),
    db.mood_logs.toArray(),
    db.spend_moments.toArray(),
  ])

  downloadCsv(
    'moodsignals-transactions.csv',
    serializeRows(transactions as Array<Record<string, unknown>>),
  )
  downloadCsv('moodsignals-moods.csv', serializeRows(moods as Array<Record<string, unknown>>))
  downloadCsv(
    'moodsignals-spend-moments.csv',
    serializeRows(spends as Array<Record<string, unknown>>),
  )

  return {
    transactions: transactions.length,
    moods: moods.length,
    spends: spends.length,
  }
}
