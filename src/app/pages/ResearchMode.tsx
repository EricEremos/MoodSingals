import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/db'
import { getDailyStreak } from '../../utils/streak'

type Task = {
  id: string
  prompt: string
  options: string[]
  correct: string
}

type TaskResult = {
  taskId: string
  answer: string
  correct: boolean
  confidence: number
  timeMs: number
}

type ReadinessSnapshot = {
  moods: number
  spends: number
  tagged: number
}

const TASKS: Task[] = [
  {
    id: 'open_ledger',
    prompt: 'Open your spending ledger.',
    options: ['Ledger', 'Settings', 'Today'],
    correct: 'Ledger',
  },
  {
    id: 'tag_purchase',
    prompt: 'Tag a purchase with a mood.',
    options: ['Ledger', 'Insights', 'Data'],
    correct: 'Ledger',
  },
  {
    id: 'import_csv',
    prompt: 'Import a CSV.',
    options: ['Data', 'Today', 'Insights'],
    correct: 'Data',
  },
  {
    id: 'open_insights',
    prompt: 'Open Insight cards.',
    options: ['Insights', 'Settings', 'Ledger'],
    correct: 'Insights',
  },
  {
    id: 'export_data',
    prompt: 'Export your records.',
    options: ['Settings', 'Data', 'Today'],
    correct: 'Settings',
  },
]

async function captureReadiness(): Promise<ReadinessSnapshot> {
  const [moods, spendMoments, transactions, tagged] = await Promise.all([
    db.mood_logs.count(),
    db.spend_moments.count(),
    db.transactions.count(),
    db.tx_mood_annotations.count(),
  ])
  return {
    moods,
    spends: spendMoments + transactions,
    tagged,
  }
}

function currentTickMs() {
  return Number(new Date())
}

function pickVariant(): 'card-feed' | 'dashboard' {
  const existing = localStorage.getItem('ms_study_variant')
  if (existing === 'card-feed' || existing === 'dashboard') return existing
  const assigned = Math.random() < 0.5 ? 'card-feed' : 'dashboard'
  localStorage.setItem('ms_study_variant', assigned)
  return assigned
}

export default function ResearchMode() {
  const [index, setIndex] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [taskStartedAt, setTaskStartedAt] = useState<number | null>(null)
  const [results, setResults] = useState<TaskResult[]>([])
  const [variant, setVariant] = useState<'card-feed' | 'dashboard'>(pickVariant)
  const [sessionCount] = useState(() => {
    const next = Number(localStorage.getItem('ms_study_sessions') || '0') + 1
    localStorage.setItem('ms_study_sessions', String(next))
    return next
  })
  const [baselineReadiness, setBaselineReadiness] = useState<ReadinessSnapshot | null>(null)
  const [finalReadiness, setFinalReadiness] = useState<ReadinessSnapshot | null>(null)

  const task = TASKS[index]

  useEffect(() => {
    const hydrate = async () => {
      const snapshot = await captureReadiness()
      setFinalReadiness(snapshot)
    }
    hydrate()
  }, [])

  const start = async () => {
    const now = currentTickMs()
    const snapshot = await captureReadiness()
    setBaselineReadiness(snapshot)
    setStartedAt(now)
    setTaskStartedAt(now)
  }

  const answer = (value: string) => {
    if (!taskStartedAt) return
    const timeMs = currentTickMs() - taskStartedAt
    const correct = value === task.correct
    setResults((prev) => {
      const next = [...prev, { taskId: task.id, answer: value, correct, confidence: 3, timeMs }]
      localStorage.setItem('ms_study_results', JSON.stringify(next))
      return next
    })
  }

  const setConfidence = (value: number) => {
    setResults((prev) => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last) last.confidence = value
      localStorage.setItem('ms_study_results', JSON.stringify(copy))
      return copy
    })
  }

  const next = async () => {
    if (index < TASKS.length - 1) {
      const now = currentTickMs()
      setIndex(index + 1)
      setTaskStartedAt(now)
    } else {
      const snapshot = await captureReadiness()
      setFinalReadiness(snapshot)
    }
  }

  const done = index >= TASKS.length - 1 && results.length === TASKS.length

  const summary = useMemo(() => {
    if (!done) return null
    const total = results.length
    const correct = results.filter((entry) => entry.correct).length
    const avgTime = total
      ? Math.round(results.reduce((acc, entry) => acc + entry.timeMs, 0) / total / 1000)
      : 0
    const avgConfidence = total
      ? Number(
          (results.reduce((acc, entry) => acc + entry.confidence, 0) / total).toFixed(2),
        )
      : 0
    return { total, correct, avgTime, avgConfidence }
  }, [done, results])

  const readinessDelta = useMemo(() => {
    if (!baselineReadiness || !finalReadiness) return null
    return {
      moods: finalReadiness.moods - baselineReadiness.moods,
      spends: finalReadiness.spends - baselineReadiness.spends,
      tagged: finalReadiness.tagged - baselineReadiness.tagged,
    }
  }, [baselineReadiness, finalReadiness])

  const exportReport = () => {
    if (!summary) return
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MoodSignals Study Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: black; }
      h1, h2 { margin: 0 0 12px; }
      .card { border: 1px solid gainsboro; border-radius: 12px; padding: 14px; margin-top: 12px; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; }
      .muted { color: dimgray; }
    </style>
  </head>
  <body>
    <h1>MoodSignals Study Report</h1>
    <p class="muted">Generated: ${new Date().toISOString()}</p>
    <div class="card">
      <h2>A/B Variant</h2>
      <div class="row"><span>Assigned layout</span><strong>${variant}</strong></div>
    </div>
    <div class="card">
      <h2>Task outcomes</h2>
      <div class="row"><span>Accuracy</span><strong>${summary.correct}/${summary.total}</strong></div>
      <div class="row"><span>Average time</span><strong>${summary.avgTime}s</strong></div>
      <div class="row"><span>Average confidence</span><strong>${summary.avgConfidence}/5</strong></div>
    </div>
    <div class="card">
      <h2>Retention proxies</h2>
      <div class="row"><span>Mood streak</span><strong>${getDailyStreak()} days</strong></div>
      <div class="row"><span>Study sessions</span><strong>${sessionCount}</strong></div>
    </div>
    <div class="card">
      <h2>Readiness change</h2>
      <div class="row"><span>Mood logs delta</span><strong>${readinessDelta?.moods ?? 0}</strong></div>
      <div class="row"><span>Spend records delta</span><strong>${readinessDelta?.spends ?? 0}</strong></div>
      <div class="row"><span>Tagged purchases delta</span><strong>${readinessDelta?.tagged ?? 0}</strong></div>
    </div>
  </body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'moodsignals-study-report.html'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Study Mode</h1>
          <p className="section-subtitle">Comprehension and retention checks.</p>
        </div>
      </div>

      <div className="card">
        <div className="helper">A/B variant: {variant}</div>
        <div className="inline-list" style={{ marginTop: 10 }}>
          <button
            className={variant === 'card-feed' ? 'button button-primary' : 'button'}
            onClick={() => {
              setVariant('card-feed')
              localStorage.setItem('ms_study_variant', 'card-feed')
            }}
          >
            Card Feed
          </button>
          <button
            className={variant === 'dashboard' ? 'button button-primary' : 'button'}
            onClick={() => {
              setVariant('dashboard')
              localStorage.setItem('ms_study_variant', 'dashboard')
            }}
          >
            Dashboard
          </button>
        </div>
      </div>

      {!startedAt ? (
        <div className="card" style={{ marginTop: 16 }}>
          <button className="button button-primary" onClick={start}>
            Start study
          </button>
        </div>
      ) : null}

      {startedAt && !done ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="section-title">
            Task {index + 1} / {TASKS.length}
          </h2>
          <p className="helper">{task.prompt}</p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            {task.options.map((option) => (
              <button key={option} className="button" onClick={() => answer(option)}>
                {option}
              </button>
            ))}
          </div>
          {results.length === index + 1 ? (
            <div style={{ marginTop: 12 }}>
              <div className="helper">Confidence</div>
              <div className="inline-list">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} className="button" onClick={() => setConfidence(value)}>
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
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="section-title">Report summary</h2>
          <p className="helper">
            Accuracy: {summary.correct}/{summary.total}
          </p>
          <p className="helper">Average time: {summary.avgTime}s</p>
          <p className="helper">Average confidence: {summary.avgConfidence}/5</p>
          <p className="helper">Mood streak: {getDailyStreak()} days</p>
          <p className="helper">Study sessions: {sessionCount}</p>
          <p className="helper">
            Readiness delta: moods {readinessDelta?.moods ?? 0}, spends {readinessDelta?.spends ?? 0}, tagged{' '}
            {readinessDelta?.tagged ?? 0}.
          </p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button className="button button-primary" onClick={exportReport}>
              Export 1-page report
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
