export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0)
}

export function mean(values: number[]) {
  if (!values.length) return 0
  return sum(values) / values.length
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function percent(part: number, total: number) {
  if (!total) return 0
  return (part / total) * 100
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}
