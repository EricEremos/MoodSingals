import { json } from './http'
import { storeAiReflection } from './supabase-rest'
import { requireGenerationConfig, type ServiceEnv } from './service-config'

type DigestCard = {
  id?: string
  title?: string
  insight?: string
  microAction?: string
  confidenceLevel?: string
  relevance?: number
}

type InsightDigest = {
  generatedAt?: string
  reflectionDue?: boolean
  counts?: {
    spendMoments?: number
    moodLogs?: number
    transactions?: number
    imports?: number
  }
  topCards?: DigestCard[]
  lowConfidenceCount?: number
}

type ReflectResult = {
  summary: string
  signals: string[]
  actions: string[]
  watchouts: string[]
  confidenceNote: string
}

type WeeklyPlanResult = {
  headline: string
  focus: string
  habits: string[]
  ifThenRule: string
  checkInPrompt: string
}

type AiResponsePayload =
  | {
      mode: 'reflect'
      result: ReflectResult
      providerName: string
      model: string | null
    }
  | {
      mode: 'weekly-plan'
      result: WeeklyPlanResult
      providerName: string
      model: string | null
    }

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

function extractMessageText(payload: ChatCompletionResponse) {
  const content = payload.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join(' ')
      .trim()
  }

  return ''
}

function sanitizeDigest(raw: InsightDigest) {
  const topCards = Array.isArray(raw.topCards)
    ? raw.topCards
        .map((card) => ({
          id: card.id?.trim() || 'unknown-card',
          title: card.title?.trim() || 'Untitled insight',
          insight: card.insight?.trim() || '',
          microAction: card.microAction?.trim() || 'Review the local card details.',
          confidenceLevel: card.confidenceLevel?.trim() || 'Unknown',
          relevance: typeof card.relevance === 'number' ? card.relevance : 0,
        }))
        .filter((card) => card.insight)
        .slice(0, 5)
    : []

  return {
    generatedAt: raw.generatedAt?.trim() || new Date().toISOString(),
    reflectionDue: Boolean(raw.reflectionDue),
    counts: {
      spendMoments: raw.counts?.spendMoments ?? 0,
      moodLogs: raw.counts?.moodLogs ?? 0,
      transactions: raw.counts?.transactions ?? 0,
      imports: raw.counts?.imports ?? 0,
    },
    topCards,
    lowConfidenceCount: raw.lowConfidenceCount ?? 0,
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('Generation provider returned text but not valid JSON.')
  }

  return text.slice(start, end + 1)
}

function normalizeStringList(value: unknown, min = 1, max = 3) {
  if (!Array.isArray(value)) {
    throw new Error('Generation provider returned an invalid list field.')
  }

  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .slice(0, max)

  if (items.length < min) {
    throw new Error('Generation provider returned too few items in a list field.')
  }

  return items
}

function parseReflectResult(text: string): ReflectResult {
  const parsed = JSON.parse(extractJsonObject(text)) as Record<string, unknown>
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  const confidenceNote =
    typeof parsed.confidenceNote === 'string' ? parsed.confidenceNote.trim() : ''

  if (!summary || !confidenceNote) {
    throw new Error('Generation provider returned an incomplete reflection payload.')
  }

  return {
    summary,
    signals: normalizeStringList(parsed.signals),
    actions: normalizeStringList(parsed.actions),
    watchouts: normalizeStringList(parsed.watchouts),
    confidenceNote,
  }
}

function parseWeeklyPlanResult(text: string): WeeklyPlanResult {
  const parsed = JSON.parse(extractJsonObject(text)) as Record<string, unknown>
  const headline = typeof parsed.headline === 'string' ? parsed.headline.trim() : ''
  const focus = typeof parsed.focus === 'string' ? parsed.focus.trim() : ''
  const ifThenRule = typeof parsed.ifThenRule === 'string' ? parsed.ifThenRule.trim() : ''
  const checkInPrompt =
    typeof parsed.checkInPrompt === 'string' ? parsed.checkInPrompt.trim() : ''

  if (!headline || !focus || !ifThenRule || !checkInPrompt) {
    throw new Error('Generation provider returned an incomplete weekly plan payload.')
  }

  return {
    headline,
    focus,
    habits: normalizeStringList(parsed.habits, 2, 3),
    ifThenRule,
    checkInPrompt,
  }
}

function buildPrompt(mode: 'reflect' | 'weekly-plan', digest: ReturnType<typeof sanitizeDigest>) {
  const cardsText = digest.topCards
    .map(
      (card, index) =>
        `${index + 1}. ${card.title} | ${card.insight} | confidence=${card.confidenceLevel} | next=${card.microAction} | relevance=${card.relevance}`,
    )
    .join('\n')

  const baseContext = [
    `Generated at: ${digest.generatedAt}`,
    `Counts: spend moments ${digest.counts.spendMoments}, mood logs ${digest.counts.moodLogs}, imported transactions ${digest.counts.transactions}, import batches ${digest.counts.imports}.`,
    `Low confidence cards: ${digest.lowConfidenceCount}.`,
    `Weekly reflection due: ${digest.reflectionDue ? 'yes' : 'no'}.`,
    'Top cards:',
    cardsText,
  ].join('\n')

  if (mode === 'reflect') {
    return [
      'Return JSON only.',
      'You are a careful financial reflection assistant for a local-first personal finance app.',
      'Do not diagnose, speculate about mental health, or overstate certainty.',
      'Use the insight cards as the only source of truth.',
      'Return this exact shape:',
      '{"summary":"...","signals":["..."],"actions":["..."],"watchouts":["..."],"confidenceNote":"..."}',
      baseContext,
    ].join('\n\n')
  }

  return [
    'Return JSON only.',
    'You are a careful financial action-planning assistant for a local-first personal finance app.',
    'Do not diagnose, moralize, or invent facts beyond the provided cards.',
    'Build a short weekly plan from the cards and current counts.',
    'Return this exact shape:',
    '{"headline":"...","focus":"...","habits":["...","...","..."],"ifThenRule":"...","checkInPrompt":"..."}',
    baseContext,
  ].join('\n\n')
}

async function callGenerationProvider(mode: 'reflect' | 'weekly-plan', digest: ReturnType<typeof sanitizeDigest>, env: ServiceEnv) {
  const config = requireGenerationConfig(env)
  const prompt = buildPrompt(mode, digest)

  const upstreamResponse = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You produce concise JSON for a finance coaching app. Never return markdown. Never wrap JSON in prose.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: mode === 'reflect' ? 320 : 300,
    }),
  }).catch(() => null)

  if (!upstreamResponse) {
    throw new Error('Could not reach the generation provider from the server.')
  }

  const upstreamJson = (await upstreamResponse.json().catch(() => null)) as ChatCompletionResponse | null

  if (!upstreamResponse.ok) {
    throw new Error(
      upstreamJson?.error?.message ?? `Generation provider returned HTTP ${upstreamResponse.status}.`,
    )
  }

  const text = upstreamJson ? extractMessageText(upstreamJson) : ''

  if (!text) {
    throw new Error('Generation provider response did not include usable text.')
  }

  return {
    providerName: config.providerName,
    model: config.model,
    rawText: text,
  }
}

export async function handleAiCoachRequest(
  request: Request,
  env: ServiceEnv,
  mode: 'reflect' | 'weekly-plan',
  userId?: string,
  accessToken?: string,
) {
  let payload: { digest?: InsightDigest }

  try {
    payload = (await request.json()) as { digest?: InsightDigest }
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400)
  }

  const digest = sanitizeDigest(payload.digest || {})

  if (!digest.topCards.length) {
    return json({ error: 'At least one insight card is required.' }, 400)
  }

  try {
    const completion = await callGenerationProvider(mode, digest, env)
    const response: AiResponsePayload =
      mode === 'reflect'
        ? {
            mode: 'reflect',
            result: parseReflectResult(completion.rawText),
            providerName: completion.providerName,
            model: completion.model,
          }
        : {
            mode: 'weekly-plan',
            result: parseWeeklyPlanResult(completion.rawText),
            providerName: completion.providerName,
            model: completion.model,
          }

    if (userId) {
      void storeAiReflection(
        {
          user_id: userId,
          mode,
          model: completion.model,
          provider: completion.providerName,
          request_json: { digest },
          response_json: response,
        },
        env,
        accessToken,
      )
    }

    return json(response)
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Could not generate AI coaching output.',
      },
      502,
    )
  }
}
