const TEMPLATE_HEADERS = [
  'occurred_at',
  'merchant',
  'description',
  'outflow',
  'inflow',
  'currency',
  'category',
  'account',
]

export function downloadTemplateCsv() {
  const headerLine = TEMPLATE_HEADERS.join(',')
  const noteLine = '# You can copy your data into this format.'
  const content = `${headerLine}\n${noteLine}\n`
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'moodsignals-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}
