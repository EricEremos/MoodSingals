import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAiCoachRequest } from './ai-service'
import { json, noContent } from './http'
import {
  createBackupForUser,
  getBackupForUser,
  listBackupsForUser,
  requireAuthenticatedUser,
} from './supabase-rest'
import { readServiceHealth, type ServiceEnv } from './service-config'

type BackupCreateBody = {
  label?: string
  snapshot?: {
    schemaVersion?: number
    spend_moments?: unknown[]
    mood_logs?: unknown[]
    transactions?: unknown[]
    imports?: unknown[]
    exportedAt?: string
  }
}

function sanitizeBackupBody(payload: BackupCreateBody) {
  const snapshot = payload.snapshot

  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('A snapshot payload is required.')
  }

  const normalized = {
    schemaVersion:
      typeof snapshot.schemaVersion === 'number' && Number.isFinite(snapshot.schemaVersion)
        ? snapshot.schemaVersion
        : 1,
    exportedAt:
      typeof snapshot.exportedAt === 'string' && snapshot.exportedAt.trim()
        ? snapshot.exportedAt
        : new Date().toISOString(),
    spend_moments: Array.isArray(snapshot.spend_moments) ? snapshot.spend_moments : [],
    mood_logs: Array.isArray(snapshot.mood_logs) ? snapshot.mood_logs : [],
    transactions: Array.isArray(snapshot.transactions) ? snapshot.transactions : [],
    imports: Array.isArray(snapshot.imports) ? snapshot.imports : [],
  }

  const label =
    typeof payload.label === 'string' && payload.label.trim()
      ? payload.label.trim().slice(0, 80)
      : `Backup ${new Date().toLocaleDateString()}`

  return {
    label,
    snapshot: normalized,
  }
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export async function handleHealthRequest(env: ServiceEnv) {
  const health = readServiceHealth(env)

  return json({
    ok: true,
    apiAvailable: true,
    mode: health.mode,
    services: {
      generation: health.generation,
      supabase: health.supabase,
    },
    warnings: health.warnings,
  })
}

async function handleBackupsListRequest(request: Request, env: ServiceEnv) {
  const auth = await requireAuthenticatedUser(request, env)

  if (!auth.ok) {
    return auth.response
  }

  try {
    const backups = await listBackupsForUser(auth.user.id, env, auth.token)
    return json({ backups })
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load backups from Supabase.',
      },
      502,
    )
  }
}

async function handleBackupCreateRequest(request: Request, env: ServiceEnv) {
  const auth = await requireAuthenticatedUser(request, env)

  if (!auth.ok) {
    return auth.response
  }

  let payload: BackupCreateBody

  try {
    payload = (await request.json()) as BackupCreateBody
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400)
  }

  try {
    const normalized = sanitizeBackupBody(payload)
    const raw = JSON.stringify(normalized.snapshot)
    const payloadHash = await sha256Hex(raw)
    const stats = {
      spendMoments: normalized.snapshot.spend_moments.length,
      moodLogs: normalized.snapshot.mood_logs.length,
      transactions: normalized.snapshot.transactions.length,
      imports: normalized.snapshot.imports.length,
    }

    const records = await createBackupForUser(
      auth.user.id,
      auth.token,
      {
        label: normalized.label,
        schema_version: normalized.snapshot.schemaVersion,
        payload_hash: payloadHash,
        payload_json: normalized.snapshot,
        stats_json: stats,
      },
      env,
    )

    return json({ backup: records[0] ?? null })
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Could not create a backup in Supabase.',
      },
      502,
    )
  }
}

async function handleBackupGetRequest(request: Request, env: ServiceEnv, id: string) {
  const auth = await requireAuthenticatedUser(request, env)

  if (!auth.ok) {
    return auth.response
  }

  try {
    const records = await getBackupForUser(id, auth.user.id, env, auth.token)
    const backup = records[0]

    if (!backup) {
      return json({ error: 'Backup not found.' }, 404)
    }

    return json({ backup })
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Could not load the requested backup.',
      },
      502,
    )
  }
}

export async function handleApiRequest(request: Request, env: ServiceEnv) {
  const { pathname } = new URL(request.url)

  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return noContent()
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    return handleHealthRequest(env)
  }

  if (pathname === '/api/ai/reflect' && request.method === 'POST') {
    const auth = await requireAuthenticatedUser(request, env)
    const userId = auth.ok ? auth.user.id : undefined
    const accessToken = auth.ok ? auth.token : undefined
    return handleAiCoachRequest(request, env, 'reflect', userId, accessToken)
  }

  if (pathname === '/api/ai/weekly-plan' && request.method === 'POST') {
    const auth = await requireAuthenticatedUser(request, env)
    const userId = auth.ok ? auth.user.id : undefined
    const accessToken = auth.ok ? auth.token : undefined
    return handleAiCoachRequest(request, env, 'weekly-plan', userId, accessToken)
  }

  if (pathname === '/api/coach-reflection' && request.method === 'POST') {
    const auth = await requireAuthenticatedUser(request, env)
    const userId = auth.ok ? auth.user.id : undefined
    const accessToken = auth.ok ? auth.token : undefined
    return handleAiCoachRequest(request, env, 'reflect', userId, accessToken)
  }

  if (pathname === '/api/backups' && request.method === 'GET') {
    return handleBackupsListRequest(request, env)
  }

  if (pathname === '/api/backups' && request.method === 'POST') {
    return handleBackupCreateRequest(request, env)
  }

  const backupMatch = pathname.match(/^\/api\/backups\/([^/]+)$/)
  if (backupMatch && request.method === 'GET') {
    return handleBackupGetRequest(request, env, backupMatch[1])
  }

  return null
}

async function readNodeRequestBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export async function nodeRequestToWebRequest(req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const method = req.method ?? 'GET'
  const hasBody = !['GET', 'HEAD'].includes(method)
  const body = hasBody ? await readNodeRequestBody(req) : undefined
  const headers = new Headers()

  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry))
      return
    }

    if (typeof value === 'string') {
      headers.set(key, value)
    }
  })

  return new Request(url, {
    method,
    headers,
    body,
  })
}

export async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const body = Buffer.from(await response.arrayBuffer())
  res.end(body)
}
