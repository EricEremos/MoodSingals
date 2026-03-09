import { json } from './http'
import { requireSupabaseConfig, type ServiceEnv } from './service-config'

type SupabaseUser = {
  id: string
  email?: string
}

type BackupSnapshotRecord = {
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
  payload_json?: unknown
}

type AiReflectionRecord = {
  user_id: string
  mode: string
  model: string | null
  provider: string
  request_json: unknown
  response_json: unknown
}

async function supabaseRequest(
  env: ServiceEnv,
  path: string,
  init: RequestInit = {},
  auth?: {
    accessToken?: string
  },
) {
  const config = requireSupabaseConfig(env)
  const accessToken = auth?.accessToken?.trim() || config.serviceRoleKey
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.projectKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ||
      (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : null) ||
      `Supabase returned HTTP ${response.status}.`

    throw new Error(message)
  }

  return payload
}

export function getBearerToken(request: Request) {
  const value = request.headers.get('authorization') || request.headers.get('Authorization')

  if (!value?.startsWith('Bearer ')) {
    return null
  }

  return value.slice('Bearer '.length).trim() || null
}

export async function requireAuthenticatedUser(request: Request, env: ServiceEnv) {
  const token = getBearerToken(request)

  if (!token) {
    return {
      ok: false as const,
      response: json({ error: 'Authentication required.' }, 401),
    }
  }

  let config: ReturnType<typeof requireSupabaseConfig>
  try {
    config = requireSupabaseConfig(env)
  } catch (error) {
    return {
      ok: false as const,
      response: json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Supabase server access is not configured on the server.',
        },
        503,
      ),
    }
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.projectKey,
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json().catch(() => null)) as SupabaseUser | { message?: string } | null

  if (!response.ok || !payload || typeof payload !== 'object' || !('id' in payload)) {
    return {
      ok: false as const,
      response: json(
        {
          error:
            (payload && 'message' in payload && typeof payload.message === 'string'
              ? payload.message
              : null) || 'Your session is invalid or expired.',
        },
        401,
      ),
    }
  }

  return {
    ok: true as const,
    user: payload,
    token,
  }
}

export async function listBackupsForUser(userId: string, env: ServiceEnv, token: string) {
  const query = `/rest/v1/backup_snapshots?select=id,label,created_at,schema_version,payload_hash,stats_json&user_id=eq.${userId}&order=created_at.desc`
  return (await supabaseRequest(env, query, { method: 'GET' }, { accessToken: token })) as BackupSnapshotRecord[]
}

export async function createBackupForUser(
  userId: string,
  token: string,
  body: {
    label: string
    schema_version: number
    payload_hash: string
    payload_json: unknown
    stats_json: BackupSnapshotRecord['stats_json']
  },
  env: ServiceEnv,
) {
  return (await supabaseRequest(
    env,
    '/rest/v1/backup_snapshots',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        ...body,
      }),
    },
    { accessToken: token },
  )) as BackupSnapshotRecord[]
}

export async function getBackupForUser(id: string, userId: string, env: ServiceEnv, token: string) {
  const query = `/rest/v1/backup_snapshots?select=id,label,created_at,schema_version,payload_hash,stats_json,payload_json&user_id=eq.${userId}&id=eq.${id}&limit=1`
  return (await supabaseRequest(env, query, { method: 'GET' }, { accessToken: token })) as BackupSnapshotRecord[]
}

export async function storeAiReflection(record: AiReflectionRecord, env: ServiceEnv, token?: string) {
  try {
    await supabaseRequest(
      env,
      '/rest/v1/ai_reflections',
      {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(record),
      },
      token ? { accessToken: token } : undefined,
    )
  } catch {
    // AI should continue working even if the history table has not been created yet.
  }
}
