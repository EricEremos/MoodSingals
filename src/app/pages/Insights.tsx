import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import InsightCard from '../../components/InsightCard'
import InfoSheet from '../../components/InfoSheet'
import { Button, Card, CardHeader, EmptyState, ProgressBar } from '../../components/ui'
import {
  db,
  type MoodLog,
  type SpendMoment,
  type Transaction,
  type TxMoodAnnotation,
} from '../../data/db'
import { computeInsights, confidenceScore } from '../../data/insights'
import { loadSampleData } from '../../data/sample'
import { copy } from '../../utils/copy'
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

export default function Insights() {
  const [spendMoments, setSpendMoments] = useState<SpendMoment[]>([])
  const [moods, setMoods] = useState<MoodLog[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [annotations, setAnnotations] = useState<TxMoodAnnotation[]>([])
  const [importsCount, setImportsCount] = useState(0)
  const [status, setStatus] = useState('')
  const [lastRefresh, setLastRefresh] = useState(0)
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [aiLoading, setAiLoading] = useState<'reflect' | 'weekly-plan' | null>(null)
  const [reflectResult, setReflectResult] = useState<AiReflectResponse | null>(null)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      const [spends, moodLogs, tx, txAnnotations, importCount] = await Promise.all([
        db.spend_moments.toArray(),
        db.mood_logs.toArray(),
        db.transactions.toArray(),
        db.tx_mood_annotations.toArray(),
        db.imports.count(),
      ])

      setSpendMoments(spends)
      setMoods(moodLogs)
      setTransactions(tx)
      setAnnotations(txAnnotations)
      setImportsCount(importCount)
    }

    void load()
  }, [lastRefresh])

  useEffect(() => {
    const loadServiceHealth = async () => {
      try {
        setServiceHealth(await fetchServiceHealth())
      } catch {
        setServiceHealth(null)
      }
    }

    void loadServiceHealth()
  }, [])

  const { cards, computeMs } = useMemo(() => {
    const start = performance.now()
    const computed = computeInsights(spendMoments, moods, transactions, annotations)
    const sorted = computed.sort((a, b) => {
      const scoreA = confidenceScore(a.confidence.level) * a.relevance
      const scoreB = confidenceScore(b.confidence.level) * b.relevance
      return scoreB - scoreA
    })

    return {
      cards: sorted.slice(0, 8),
      computeMs: Math.round(performance.now() - start),
    }
  }, [spendMoments, moods, transactions, annotations])

  const reflectionDue = useMemo(() => {
    if (!spendMoments.length && !moods.length) return false
    const last = Number(localStorage.getItem('ms_reflection_done') || 0)
    if (!last) return true
    return Date.now() - last > 6 * 24 * 60 * 60 * 1000
  }, [spendMoments.length, moods.length])

  const readiness = useMemo(() => {
    const now = Date.now()
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
  }, [moods, spendMoments, transactions, annotations])

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
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.insights.title}</h2>
        </div>
      </div>

      {status ? <p className="status-text">{status}</p> : null}

      <div className="grid grid-2">
        <Card elevated>
          <CardHeader>
            <h3 className="card-title">{copy.insights.startTitle}</h3>
            <InfoSheet title={copy.insights.startInfoTitle}>
              <ul className="sheet-list">
                {copy.insights.startInfoBody.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </InfoSheet>
          </CardHeader>
          <div className="inline-list" style={{ marginTop: 16 }}>
            <Button variant="primary" type="button" onClick={() => void loadDemo()}>
              {copy.insights.demoAction}
            </Button>
            <Link to="/today" className="button button-muted">
              {copy.insights.logAction}
            </Link>
            <Link to="/data" className="button">
              {copy.insights.importAction}
            </Link>
          </div>
          {reflectionDue ? (
            <p className="body-subtle" style={{ marginTop: 12 }}>
              Weekly reflection is due. Generate coaching or log a new moment to keep momentum.
            </p>
          ) : null}
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
          <div className="metric-list" style={{ marginTop: 16 }}>
            <div className="metric-row">
              <span>Import batches</span>
              <strong>{importsCount}</strong>
            </div>
            <div className="metric-row">
              <span>Last compute</span>
              <strong>{computeMs}ms</strong>
            </div>
          </div>
        </Card>
      </div>

      <Card elevated style={{ marginTop: 16 }}>
        <CardHeader>
          <div>
            <h3 className="card-title">AI coach</h3>
            <p className="body-subtle">
              Only a derived digest of local insight cards is sent when you request coaching.
            </p>
          </div>
          <span className={serviceHealth?.services.generation.configured ? 'status-ok' : 'status-warn'}>
            {serviceHealth?.services.generation.configured ? 'Ready' : 'Unavailable'}
          </span>
        </CardHeader>

        <div className="inline-list" style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            type="button"
            onClick={() => void requestAi('reflect')}
            disabled={aiLoading !== null || !serviceHealth?.services.generation.configured}
          >
            {aiLoading === 'reflect' ? 'Generating...' : 'Generate reflection'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void requestAi('weekly-plan')}
            disabled={aiLoading !== null || !serviceHealth?.services.generation.configured}
          >
            {aiLoading === 'weekly-plan' ? 'Generating...' : 'Build weekly plan'}
          </Button>
          {serviceHealth?.services.generation.model ? (
            <span className="status-chip">{serviceHealth.services.generation.model}</span>
          ) : null}
        </div>

        {serviceHealth?.warnings.length ? (
          <div className="metric-list" style={{ marginTop: 16 }}>
            {serviceHealth.warnings.map((warning) => (
              <p key={warning} className="body-subtle">
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        {aiStatus ? <p className="helper" style={{ marginTop: 12 }}>{aiStatus}</p> : null}

        {reflectResult ? (
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <Card>
              <h3 className="card-title">Reflection</h3>
              <p className="body-subtle">{reflectResult.result.summary}</p>
              <p className="helper" style={{ marginTop: 12 }}>
                Confidence note: {reflectResult.result.confidenceNote}
              </p>
            </Card>
            <Card>
              <h3 className="card-title">Signals</h3>
              <ul className="sheet-list">
                {reflectResult.result.signals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 className="card-title" style={{ marginTop: 16 }}>
                Watchouts
              </h3>
              <ul className="sheet-list">
                {reflectResult.result.watchouts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="card-title">Next actions</h3>
              <ul className="sheet-list">
                {reflectResult.result.actions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}

        {weeklyPlan ? (
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <Card>
              <h3 className="card-title">{weeklyPlan.result.headline}</h3>
              <p className="body-subtle">{weeklyPlan.result.focus}</p>
              <p className="helper" style={{ marginTop: 12 }}>
                If/then rule: {weeklyPlan.result.ifThenRule}
              </p>
            </Card>
            <Card>
              <h3 className="card-title">Habits for this week</h3>
              <ul className="sheet-list">
                {weeklyPlan.result.habits.map((habit) => (
                  <li key={habit}>{habit}</li>
                ))}
              </ul>
              <h3 className="card-title" style={{ marginTop: 16 }}>
                Check-in prompt
              </h3>
              <p className="body-subtle">{weeklyPlan.result.checkInPrompt}</p>
            </Card>
          </div>
        ) : null}
      </Card>

      <section style={{ marginTop: 16 }}>
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
          <EmptyState
            title={copy.insights.emptyCards}
            action={
              <Button variant="primary" type="button" onClick={() => void loadDemo()}>
                {copy.insights.demoAction}
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}
