import type { InsightDigest } from './insightDigest'
import type { LocalSnapshot } from './localSnapshot'

export type ServiceHealth = {
  apiAvailable: boolean
  mode: 'local-only' | 'partial' | 'connected'
  services: {
    generation: {
      configured: boolean
      providerName: string
      model: string | null
      endpointHost: string | null
    }
    supabase: {
      configured: boolean
      projectHost: string | null
    }
  }
  warnings: string[]
}

export type AiReflectResponse = {
  mode: 'reflect'
  providerName: string
  model: string | null
  result: {
    summary: string
    signals: string[]
    actions: string[]
    watchouts: string[]
    confidenceNote: string
  }
}

export type WeeklyPlanResponse = {
  mode: 'weekly-plan'
  providerName: string
  model: string | null
  result: {
    headline: string
    focus: string
    habits: string[]
    ifThenRule: string
    checkInPrompt: string
  }
}

export type BackupRecord = {
  id: string
  label: string
  created_at: string
  schema_version: number
  payload_hash: string
  stats_json: {
    spendMoments?: number
    moodLogs?: number
    transactions?: number
    imports?: number
  }
  payload_json?: LocalSnapshot
}

async function parseJson<T>(response: Response) {
  return (await response.json()) as T
}

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function fetchServiceHealth() {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error(`Health request failed with HTTP ${response.status}.`)
  }

  return parseJson<ServiceHealth>(response)
}

export async function requestAiReflect(digest: InsightDigest, accessToken?: string) {
  const response = await fetch('/api/ai/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders(accessToken) || {}),
    },
    body: JSON.stringify({ digest }),
  })

  const body = await parseJson<AiReflectResponse | { error?: string }>(response)

  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : 'Reflection request failed.')
  }

  return body as AiReflectResponse
}

export async function requestWeeklyPlan(digest: InsightDigest, accessToken?: string) {
  const response = await fetch('/api/ai/weekly-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders(accessToken) || {}),
    },
    body: JSON.stringify({ digest }),
  })

  const body = await parseJson<WeeklyPlanResponse | { error?: string }>(response)

  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : 'Weekly plan request failed.')
  }

  return body as WeeklyPlanResponse
}

export async function listBackups(accessToken: string) {
  const response = await fetch('/api/backups', {
    headers: authHeaders(accessToken),
  })

  const body = await parseJson<{ backups?: BackupRecord[]; error?: string }>(response)

  if (!response.ok) {
    throw new Error(body.error || 'Could not load backups.')
  }

  return body.backups || []
}

export async function createBackup(accessToken: string, payload: { label: string; snapshot: LocalSnapshot }) {
  const response = await fetch('/api/backups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders(accessToken) || {}),
    },
    body: JSON.stringify(payload),
  })

  const body = await parseJson<{ backup?: BackupRecord; error?: string }>(response)

  if (!response.ok || !body.backup) {
    throw new Error(body.error || 'Could not create a backup.')
  }

  return body.backup
}

export async function getBackup(accessToken: string, id: string) {
  const response = await fetch(`/api/backups/${id}`, {
    headers: authHeaders(accessToken),
  })

  const body = await parseJson<{ backup?: BackupRecord; error?: string }>(response)

  if (!response.ok || !body.backup) {
    throw new Error(body.error || 'Could not load the requested backup.')
  }

  return body.backup
}
