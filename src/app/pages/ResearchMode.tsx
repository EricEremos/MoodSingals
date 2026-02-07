import { useMemo, useState } from 'react'

type Task = {
  id: string
  prompt: string
  options: string[]
  correct: string
}

const TASKS: Task[] = [
  { id: 'log_spend', prompt: 'Log a spend moment.', options: ['Today', 'Timeline', 'Settings'], correct: 'Today' },
  { id: 'log_mood', prompt: 'Log a mood.', options: ['Today', 'Data', 'Settings'], correct: 'Today' },
  { id: 'import', prompt: 'Import transactions.', options: ['Data', 'Insights', 'Timeline'], correct: 'Data' },
  { id: 'export', prompt: 'Export your data.', options: ['Settings', 'Today', 'Timeline'], correct: 'Settings' },
  { id: 'insights', prompt: 'Find your insight cards.', options: ['Insights', 'Data', 'Timeline'], correct: 'Insights' },
]

export default function ResearchMode() {
  const [index, setIndex] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [taskStartedAt, setTaskStartedAt] = useState<number | null>(null)
  const [results, setResults] = useState<Array<{
    taskId: string
    answer: string
    correct: boolean
    confidence: number
    timeMs: number
  }>>([])

  const task = TASKS[index]

  const start = () => {
    const now = Date.now()
    setStartedAt(now)
    setTaskStartedAt(now)
  }

  const answer = (value: string) => {
    if (!taskStartedAt) return
    const timeMs = Date.now() - taskStartedAt
    const correct = value === task.correct
    setResults((prev) => {
      const next = [
        ...prev,
        { taskId: task.id, answer: value, correct, confidence: 3, timeMs },
      ]
      localStorage.setItem('ms_research_results', JSON.stringify(next))
      return next
    })
  }

  const setConfidence = (value: number) => {
    setResults((prev) => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last) last.confidence = value
      localStorage.setItem('ms_research_results', JSON.stringify(copy))
      return copy
    })
  }

  const next = () => {
    if (index < TASKS.length - 1) {
      const now = Date.now()
      setIndex(index + 1)
      setTaskStartedAt(now)
    }
  }

  const done = index >= TASKS.length - 1 && results.length === TASKS.length

  const summary = useMemo(() => {
    if (!done) return null
    const total = results.length
    const correct = results.filter((r) => r.correct).length
    const avgTime = total
      ? Math.round(results.reduce((acc, r) => acc + r.timeMs, 0) / total / 1000)
      : 0
    return { total, correct, avgTime }
  }, [done, results])

  const exportResults = () => {
    const payload = {
      started_at: startedAt,
      completed_at: Date.now(),
      results,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'moodsignals-research-mode.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Research Mode</h1>
          <p className="section-subtitle">5 quick tasks.</p>
        </div>
      </div>

      {!startedAt ? (
        <div className="card">
          <button className="button button-primary" onClick={start}>
            Start
          </button>
        </div>
      ) : null}

      {startedAt && !done ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">
            Task {index + 1} of {TASKS.length}
          </h2>
          <p className="helper">{task.prompt}</p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            {task.options.map((option) => (
              <button
                key={option}
                className="button"
                onClick={() => answer(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {results.length === index + 1 ? (
            <div style={{ marginTop: 12 }}>
              <div className="helper">Confidence</div>
              <div className="inline-list">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className="button"
                    onClick={() => setConfidence(value)}
                  >
                    {value}
                  </button>
                ))}
                <button className="button button-primary" onClick={next}>
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {done && summary ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Report</h2>
          <p className="helper">Accuracy: {summary.correct}/{summary.total}</p>
          <p className="helper">Avg time: {summary.avgTime}s</p>
          <p className="helper">
            Summary: Users complete 5 tasks with {Math.round((summary.correct / summary.total) * 100)}%
            accuracy in ~{summary.avgTime}s.
          </p>
          <div style={{ marginTop: 12 }}>
            {results.map((r) => (
              <div key={r.taskId} className="status-row">
                <span>{r.taskId}</span>
                <span className="status-value">{Math.round(r.timeMs / 1000)}s</span>
              </div>
            ))}
          </div>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button className="button button-primary" onClick={exportResults}>
              Export JSON
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
