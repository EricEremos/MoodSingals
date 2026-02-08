import Papa from 'papaparse'

const ctx: Worker = self as unknown as Worker

type ParseMessage = {
  file: File
}

function detectDelimiter(sample: string) {
  const candidates = [',', '\t', ';', '|']
  const counts = candidates.map((candidate) => ({
    candidate,
    count: sample.split(candidate).length - 1,
  }))
  counts.sort((a, b) => b.count - a.count)
  return counts[0]?.count ? counts[0].candidate : ','
}

function isLikelyHeader(row1: string[], row2: string[]) {
  const scoreRow = (row: string[]) =>
    row.reduce(
      (acc, value) => acc + (Number.isNaN(Number(value)) ? 1 : 0),
      0,
    ) / Math.max(row.length, 1)
  return scoreRow(row1) > scoreRow(row2)
}

ctx.onmessage = async (event: MessageEvent<ParseMessage>) => {
  const { file } = event.data
  const start = performance.now()
  const sample = await file.slice(0, 4096).text()
  const delimiter = detectDelimiter(sample)

  let headers: string[] = []
  const rows: string[][] = []
  const preview: string[][] = []
  let rowCount = 0
  let pendingFirstRow: string[] | null = null
  let headerDetected = false

  Papa.parse<string[]>(file, {
    delimiter,
    skipEmptyLines: true,
    chunkSize: 1024 * 32,
    chunk: (results, parser) => {
      const chunkRows = results.data as unknown as string[][]
      for (const row of chunkRows) {
        if (!pendingFirstRow) {
          pendingFirstRow = row
          continue
        }
        if (!headers.length && pendingFirstRow) {
          headerDetected = isLikelyHeader(pendingFirstRow, row)
          if (headerDetected) {
            headers = pendingFirstRow
          } else {
            headers = pendingFirstRow.map((_, idx) => `Column ${idx + 1}`)
            rows.push(pendingFirstRow)
            rowCount += 1
          }
          pendingFirstRow = null
        }

        if (!headers.length) {
          headers = row.map((_, idx) => `Column ${idx + 1}`)
        } else {
          rows.push(row)
          rowCount += 1
          if (preview.length < 20) preview.push(row)
        }
      }

      const percent = results.meta.cursor
        ? Math.min(100, Math.round((results.meta.cursor / file.size) * 100))
        : 0
      ctx.postMessage({ type: 'progress', percent, rowCount })

      if (results.errors?.length) {
        ctx.postMessage({ type: 'error', errors: results.errors })
        parser.abort()
      }
    },
    complete: () => {
      if (pendingFirstRow && !headers.length) {
        headers = pendingFirstRow.map((_, idx) => `Column ${idx + 1}`)
        rows.push(pendingFirstRow)
        rowCount += 1
        if (preview.length < 20) preview.push(pendingFirstRow)
      }
      const parseMs = Math.round(performance.now() - start)
      ctx.postMessage({
        type: 'complete',
        headers,
        rows,
        preview,
        delimiter,
        rowCount,
        parseMs,
        headerDetected,
      })
    },
  })
}
