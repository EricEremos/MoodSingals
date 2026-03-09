import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import InsightCard from '../../components/InsightCard'
import SpendMomentQuickLog from '../../components/SpendMomentQuickLog'
import { db, type MoodLog, type SpendMoment, type Transaction } from '../../data/db'
import { computeInsights, confidenceScore, type InsightCardResult } from '../../data/insights'
import { buildInsightDigest } from '../../lib/insightDigest'
import {
  fetchServiceHealth,
  requestAiReflect,
  requestWeeklyPlan,
  type AiReflectResponse,
  type ServiceHealth,
  type WeeklyPlanResponse,
} from '../../lib/serviceApi'
import { getCurrentSession } from '../../lib/supabaseClient'
import { sameLocalDay } from '../../utils/dates'
import { loadSampleData } from '../../data/sample'
import { copy } from '../../utils/copy'

export default function Insights() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [importsCount, setImportsCount] = useState(0)
  const [cards, setCards] = useState<InsightCardResult[]>([])
  const [computeMs, setComputeMs] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(0)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [status, setStatus] = useState('')
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [aiLoading, setAiLoading] = useState<'reflect' | 'weekly-plan' | null>(null)
  const [reflectResult, setReflectResult] = useState<AiReflectResponse | null>(null)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const [spends, logs, tx, importCount] = await Promise.all([
        db.spend_moments.toArray(),
        db.mood_logs.toArray(),
        db.transactions.toArray(),
        db.imports.count(),
      ])
      setSpendMoments(spends)
      setMoods(moodLogs)
      setTransactions(tx)
      setImportsCount(importCount)
    }
    void load()
  }, [lastRefresh])

  useEffect(() => {
    const loadServiceHealth = async () => {
      try {
        const nextHealth = await fetchServiceHealth()
        setServiceHealth(nextHealth)
      } catch {
        setServiceHealth(null)
      }
    }

    void loadServiceHealth()
  }, [])

  useEffect(() => {
    const start = performance.now()
    const computed = computeInsights(spendMoments, moods, transactions)
    const sorted = computed.sort((a, b) => {
      const scoreA = confidenceScore(a.confidence.level) * a.relevance
      const scoreB = confidenceScore(b.confidence.level) * b.relevance
      return scoreB - scoreA
    })
    const end = performance.now()
    setComputeMs(Math.round(end - start))
    setCards(sorted)
  }, [spendMoments, moods, transactions])

  const today = new Date()
  const hasSpendToday = spendMoments.some((moment) =>
    sameLocalDay(new Date(moment.created_at), today),
  )
  const hasMoodToday = moods.some((mood) => sameLocalDay(new Date(mood.occurred_at), today))

  const reflectionDue = useMemo(() => {
    if (!spendMoments.length && !moods.length) return false
    const last = Number(localStorage.getItem('ms_reflection_done') || 0)
    if (!last) return true
    return Date.now() - last > 6 * 24 * 60 * 60 * 1000
  }, [spendMoments.length, moods.length])

  const insightDigest = useMemo(
    () =>
      buildInsightDigest({
        cards,
        reflectionDue,
        counts: {
          spendMoments: spendMoments.length,
          moodLogs: moods.length,
          transactions: transactions.length,
          imports: importsCount,
        },
      }),
    [cards, reflectionDue, spendMoments.length, moods.length, transactions.length, importsCount],
  )

  const readiness = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000
    const moodsThisWeek = moods.filter((entry) => new Date(entry.occurred_at).getTime() >= weekAgo).length
    const spendLast30 =
      spendMoments.filter((entry) => new Date(entry.created_at).getTime() >= monthAgo).length +
      transactions.filter((entry) => new Date(entry.occurred_at).getTime() >= monthAgo).length
    const moodTaggedPurchases = annotations.length
    const totalSpend = spendLast30 || 1
    const coverage = Math.round((moodTaggedPurchases / totalSpend) * 100)
    return {
      moodsThisWeek,
      spendLast30,
      moodTaggedPurchases,
      coverage,
    }
  }, [moods, spendMoments, transactions, annotations, now])

  const loadDemo = async () => {
    try {
      setStatus('Loading...')
      await loadSampleData()
      setStatus(copy.insights.demoLoaded)
      setLastRefresh(Date.now())
    } catch {
      setStatus(copy.insights.demoFailed)
    }
  }

  const requestAi = async (mode: 'reflect' | 'weekly-plan') => {
    if (!cards.length) {
      setAiStatus('Add more local data before requesting AI coaching.')
      return
    }

    setAiLoading(mode)
    setAiStatus(mode === 'reflect' ? 'Generating reflection...' : 'Generating weekly plan...')

    try {
      const session = await getCurrentSession()
      const accessToken = session?.access_token

      if (mode === 'reflect') {
        const response = await requestAiReflect(insightDigest, accessToken)
        setReflectResult(response)
        setAiStatus(`Reflection generated with ${response.providerName}.`)
        return
      }

      const response = await requestWeeklyPlan(insightDigest, accessToken)
      setWeeklyPlan(response)
      setAiStatus(`Weekly plan generated with ${response.providerName}.`)
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : 'Could not generate AI coaching output.')
    } finally {
      setAiLoading(null)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2 className="page-title">{copy.insights.title}</h2>
        </div>
      </header>

      {status ? <p className="status-text">{status}</p> : null}

      <div className="grid grid-2">
        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Next action</h2>
            </div>
          </div>
          <h3 style={{ marginTop: 0 }}>{nextAction.title}</h3>
          <p className="helper">{nextAction.description}</p>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={() => void runAction(nextAction.primaryAction)}
            >
              {nextAction.primaryLabel}
            </button>
            <button className="button" onClick={() => void runAction(nextAction.secondaryAction)}>
              {nextAction.secondaryLabel}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Quick start</h2>
            </div>
          </div>
          <div className="stepper">
            <div className={`step ${spendMoments.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">1. Log a spend moment</div>
              </div>
              <span className="step-status">{spendMoments.length ? 'Done' : 'Now'}</span>
            </div>
            <div className={`step ${moods.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">2. Log a mood</div>
              </div>
              <span className="step-status">{moods.length ? 'Done' : 'Next'}</span>
            </div>
            <div className={`step ${transactions.length ? 'step-done' : ''}`}>
              <div>
                <div className="step-title">3. Import history</div>
              </div>
              <span className="step-status">{transactions.length ? 'Done' : 'Optional'}</span>
            </div>
            <div className="inline-list">
              <Link to="/log" className="button button-primary">
                Log now
              </Link>
              <Link to="/import" className="button button-muted">
                Import history
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="card-title">{copy.insights.readinessTitle}</h3>
            <InfoSheet title={copy.insights.readinessInfoTitle}>
              <ul className="sheet-list">
                {copy.insights.readinessInfoBody.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </InfoSheet>
          </CardHeader>
          <div className="metric-list" style={{ marginTop: 16 }}>
            <ProgressBar label={copy.insights.moodsMetric} value={readiness.moodsThisWeek} max={7} />
            <ProgressBar label={copy.insights.spendMetric} value={readiness.spendLast30} max={30} />
            <ProgressBar
              label={copy.insights.taggedMetric}
              value={readiness.moodTaggedPurchases}
              max={10}
              valueLabel={`${readiness.coverage}%`}
            />
          </div>
          <div className="status-row">
            <span>Import batches</span>
            <span className="status-value">{importsCount}</span>
          </div>
          {computeMs ? (
            <div className="status-row">
              <span>Last compute</span>
              <span className="status-value">{computeMs}ms</span>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 28 }} className="card card-elevated">
        <div className="card-header">
          <div>
            <h2 className="insight-title">AI coach</h2>
            <p className="helper">
              AI only sees a derived digest of your local insight cards, not your raw CSV file.
            </p>
          </div>
          <span
            className={serviceHealth?.services.generation.configured ? 'status-ok' : 'status-warn'}
          >
            {serviceHealth?.services.generation.configured ? 'Ready' : 'Unavailable'}
          </span>
        </div>

        <div className="inline-list">
          <button
            className="button button-primary"
            onClick={() => void requestAi('reflect')}
            disabled={aiLoading !== null || !serviceHealth?.services.generation.configured}
          >
            {aiLoading === 'reflect' ? 'Generating...' : 'Generate reflection'}
          </button>
          <button
            className="button"
            onClick={() => void requestAi('weekly-plan')}
            disabled={aiLoading !== null || !serviceHealth?.services.generation.configured}
          >
            {aiLoading === 'weekly-plan' ? 'Generating...' : 'Build weekly plan'}
          </button>
          {serviceHealth?.services.generation.model ? (
            <span className="pill">{serviceHealth.services.generation.model}</span>
          ) : null}
        </div>

        {aiStatus ? <p className="helper">{aiStatus}</p> : null}

        {reflectResult ? (
          <div style={{ marginTop: 14 }} className="grid grid-2">
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Reflection</h3>
              <p className="helper">{reflectResult.result.summary}</p>
              <div className="micro-action" style={{ marginTop: 12 }}>
                <strong>Confidence note:</strong> {reflectResult.result.confidenceNote}
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Signals</h3>
              <ul>
                {reflectResult.result.signals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Watchouts</h3>
              <ul>
                {reflectResult.result.watchouts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Next actions</h3>
              <ul>
                {reflectResult.result.actions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {weeklyPlan ? (
          <div style={{ marginTop: 14 }} className="grid grid-2">
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{weeklyPlan.result.headline}</h3>
              <p className="helper">{weeklyPlan.result.focus}</p>
              <div className="micro-action" style={{ marginTop: 12 }}>
                <strong>If/then rule:</strong> {weeklyPlan.result.ifThenRule}
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Habits for this week</h3>
              <ul>
                {weeklyPlan.result.habits.map((habit) => (
                  <li key={habit}>{habit}</li>
                ))}
              </ul>
              <h3>Check-in prompt</h3>
              <p className="helper">{weeklyPlan.result.checkInPrompt}</p>
            </div>
          </div>
        ) : null}
      </div>

      {reflectionDue ? (
        <div id="reflection" style={{ marginTop: 28 }} className="card card-elevated">
          <div className="card-header">
            <div>
              <h2 className="insight-title">Weekly reflection</h2>
            </div>
          </div>
          <div className="grid">
            <div className="helper">1) What felt worth it?</div>
            <div className="helper">2) Where did urges show up?</div>
            <div className="helper">3) One small change for next week.</div>
          </div>
          <div className="inline-list" style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={() => {
                localStorage.setItem('ms_reflection_done', String(Date.now()))
                setLastRefresh(Date.now())
              }}
            >
              Mark done
            </button>
            <Link to="/log" className="button">
              Log a moment
            </Link>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <div className="section-header">
          <div className="section-title">{copy.insights.feedTitle}</div>
        </div>

        {cards.length ? (
          <div className="card-feed">
            {cards.map((card) => (
              <InsightCard key={card.spec.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyState title={copy.insights.emptyCards} />
        )}
      </section>
    </div>
  )
}
