import { browserTimeZone, parseDateValue, toISO } from '../../utils/dates'
import { sha256 } from '../../utils/hash'
import type { ColumnMapping } from './mapping'
import type { Transaction } from '../db'

export type NormalizeOptions = {
  timezone?: string
  negativesAreOutflow: boolean
  importBatchId: string
  defaultCategory?: string
  defaultCurrency?: string
}

export type NormalizeResult = {
  transactions: Transaction[]
  dateFailures: number
  amountFailures: number
  timeUnknownCount: number
}

function sanitizeAmount(raw: string) {
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  return Number.parseFloat(cleaned)
}

export async function normalizeRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  options: NormalizeOptions,
): Promise<NormalizeResult> {
  const transactions: Transaction[] = []
  const timezone = options.timezone || browserTimeZone
  let dateFailures = 0
  let amountFailures = 0
  let timeUnknownCount = 0

  const getIndex = (header: string | null) =>
    header ? headers.indexOf(header) : -1

  const idxDate = getIndex(mapping.date)
  const idxAmount = getIndex(mapping.amount)
  const idxMerchant = getIndex(mapping.merchant)
  const idxDescription = getIndex(mapping.description)
  const idxCategory = getIndex(mapping.category)
  const idxCurrency = getIndex(mapping.currency)

  for (const row of rows) {
    const dateValue = idxDate >= 0 ? row[idxDate] : ''
    const amountValue = idxAmount >= 0 ? row[idxAmount] : ''
    const { date, timeUnknown } = parseDateValue(String(dateValue || ''))
    if (!date) {
      dateFailures += 1
      continue
    }

    const amount = sanitizeAmount(String(amountValue || ''))
    if (Number.isNaN(amount)) {
      amountFailures += 1
      continue
    }

    const merchant = String(row[idxMerchant] || '').trim() || 'Unknown Merchant'
    const description = String(row[idxDescription] || '').trim()
    const category =
      (idxCategory >= 0 ? String(row[idxCategory] || '').trim() : '') ||
      options.defaultCategory ||
      'Uncategorized'
    const currency =
      (idxCurrency >= 0 ? String(row[idxCurrency] || '').trim() : '') ||
      options.defaultCurrency

    const isOutflow = options.negativesAreOutflow ? amount < 0 : amount > 0
    const outflow = isOutflow ? Math.abs(amount) : 0
    const inflow = isOutflow ? 0 : Math.abs(amount)

    if (timeUnknown) timeUnknownCount += 1

    const occurredAt = toISO(date)
    const descriptionTrimmed = description.trim()
    const rawInput = `${occurredAt}|${amount}|${merchant}|${descriptionTrimmed}`
    const raw_hash = await sha256(rawInput)
    const hashInput = `${rawInput}|${options.importBatchId}`
    const id = await sha256(hashInput)

    transactions.push({
      id,
      occurred_at: occurredAt,
      timezone,
      amount,
      merchant,
      description,
      category,
      currency,
      outflow,
      inflow,
      time_unknown: timeUnknown,
      import_batch_id: options.importBatchId,
      raw_hash,
    })
  }

  return { transactions, dateFailures, amountFailures, timeUnknownCount }
}
