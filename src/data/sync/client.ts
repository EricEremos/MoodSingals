const API_BASE = (import.meta.env.VITE_SYNC_API_BASE || '/api').replace(/\/$/, '')

type RegisterStartResponse = {
  user_id: string
  request_id: string
  options: unknown
}

type LoginStartResponse = {
  request_id: string
  options: unknown
}

type VaultResponse = {
  ciphertext: string
  salt: string
  version: number
  updated_at: number
} | null

type RequestOptions = {
  method?: string
  headers?: HeadersInit
  body?: unknown
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: init.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getMe() {
  return request<{ user_id: string }>('/me', { method: 'GET' })
}

export function registerStart() {
  return request<RegisterStartResponse>('/auth/register/start', { method: 'POST', body: {} })
}

export function registerFinish(payload: {
  user_id: string
  request_id: string
  credential: unknown
}) {
  return request<{ ok: true; user_id: string }>('/auth/register/finish', {
    method: 'POST',
    body: payload,
  })
}

export function loginStart(userId?: string) {
  return request<LoginStartResponse>('/auth/login/start', {
    method: 'POST',
    body: { user_id: userId || undefined },
  })
}

export function loginFinish(payload: {
  request_id: string
  credential: unknown
}) {
  return request<{ ok: true; user_id: string }>('/auth/login/finish', {
    method: 'POST',
    body: payload,
  })
}

export function logout() {
  return request<{ ok: true }>('/auth/logout', { method: 'POST', body: {} })
}

export function getVault() {
  return request<VaultResponse>('/vault', { method: 'GET' })
}

export function putVault(payload: {
  ciphertext: string
  salt: string
  version: number
}) {
  return request<{ ok: true; version: number; updated_at: number }>('/vault', {
    method: 'PUT',
    body: payload,
  })
}
