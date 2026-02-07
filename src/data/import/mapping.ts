export type ColumnMapping = {
  date: string | null
  amount: string | null
  merchant: string | null
  description: string | null
  category: string | null
  currency: string | null
}

const HEADER_HINTS: Record<keyof ColumnMapping, string[]> = {
  date: ['date', 'datetime', 'timestamp', 'posted', 'occurred', 'time'],
  amount: ['amount', 'amt', 'value', 'total', 'charge', 'debit', 'credit'],
  merchant: ['merchant', 'payee', 'vendor', 'store', 'counterparty'],
  description: ['description', 'memo', 'note', 'details', 'narrative'],
  category: ['category', 'cat', 'type', 'group'],
  currency: ['currency', 'ccy'],
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => header.toLowerCase().trim())
  const mapping: ColumnMapping = {
    date: null,
    amount: null,
    merchant: null,
    description: null,
    category: null,
    currency: null,
  }

  Object.entries(HEADER_HINTS).forEach(([key, hints]) => {
    const matchIndex = normalized.findIndex((header) =>
      hints.some((hint) => header.includes(hint)),
    )
    if (matchIndex >= 0) {
      mapping[key as keyof ColumnMapping] = headers[matchIndex]
    }
  })

  return mapping
}

export function normalizeHeaderFallback(headers: string[], rowLength: number) {
  if (headers.length) return headers
  return Array.from({ length: rowLength }, (_, idx) => `Column ${idx + 1}`)
}
