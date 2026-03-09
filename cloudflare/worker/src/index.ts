import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

type Env = {
  DB: D1Database
  SESSION_SECRET: string
  RP_ID: string
  RP_NAME: string
  ORIGIN: string
}

type SessionPayload = {
  user_id: string
  exp: number
}

type ChallengeRecord = {
  id: string
  user_id: string | null
  challenge: string
  purpose: string
  expires_at: number
}

const COOKIE_NAME = 'ms_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const CHALLENGE_TTL_MS = 5 * 60 * 1000

const textEncoder = new TextEncoder()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.SESSION_SECRET) {
      return errorResponse('SESSION_SECRET is required', 500, env)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      if (request.method === 'POST' && pathname === '/auth/register/start') {
        const body = await readJson<{ user_id?: string }>(request)
        const userId = body.user_id || crypto.randomUUID()
        const now = Date.now()

        await env.DB.prepare(
          'INSERT OR IGNORE INTO users (id, created_at, last_login_at) VALUES (?1, ?2, ?3)',
        )
          .bind(userId, now, now)
          .run()

        const existing = await env.DB.prepare(
          'SELECT id FROM webauthn_credentials WHERE user_id = ?1',
        )
          .bind(userId)
          .all<{ id: string }>()

        const options = await generateRegistrationOptions({
          rpID: env.RP_ID,
          rpName: env.RP_NAME,
          userID: textEncoder.encode(userId),
          userName: `user-${userId.slice(0, 8)}`,
          userDisplayName: `MoodSignals ${userId.slice(0, 6)}`,
          attestationType: 'none',
          authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
          excludeCredentials: (existing.results || []).map((item) => ({
            id: item.id,
            type: 'public-key',
          })),
        })

        const requestId = crypto.randomUUID()
        await saveChallenge(env, {
          id: requestId,
          user_id: userId,
          challenge: options.challenge,
          purpose: 'register',
          expires_at: Date.now() + CHALLENGE_TTL_MS,
        })

        return jsonResponse({ user_id: userId, request_id: requestId, options }, 200, env)
      }

      if (request.method === 'POST' && pathname === '/auth/register/finish') {
        const body = await readJson<{
          user_id: string
          request_id: string
          credential: unknown
        }>(request)
        const challenge = await getChallenge(env, body.request_id, 'register')
        if (!challenge) return errorResponse('Challenge expired', 400, env)

        const verification = await verifyRegistrationResponse({
          response: body.credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
          expectedChallenge: challenge.challenge,
          expectedOrigin: env.ORIGIN,
          expectedRPID: env.RP_ID,
          requireUserVerification: false,
        })

        if (!verification.verified || !verification.registrationInfo) {
          return errorResponse('Passkey registration failed', 400, env)
        }

        const info = verification.registrationInfo as unknown as {
          credential?: { id: Uint8Array | string; publicKey: Uint8Array | string; counter: number }
          credentialID?: Uint8Array | string
          credentialPublicKey?: Uint8Array | string
          counter?: number
        }

        const credentialId = normalizeCredentialField(
          info.credential?.id || info.credentialID,
        )
        const publicKey = normalizeCredentialField(
          info.credential?.publicKey || info.credentialPublicKey,
        )
        const counter = info.credential?.counter ?? info.counter ?? 0
        const transports = JSON.stringify(
          (
            body.credential as {
              response?: { transports?: string[] }
            }
          ).response?.transports || [],
        )
        const now = Date.now()

        await env.DB.prepare(
          'INSERT OR REPLACE INTO webauthn_credentials (id, user_id, public_key, counter, transports, created_at, last_used_at) VALUES (?1, ?2, ?3, ?4, ?5, COALESCE((SELECT created_at FROM webauthn_credentials WHERE id = ?1), ?6), ?6)',
        )
          .bind(credentialId, body.user_id, publicKey, counter, transports, now)
          .run()
        await env.DB.prepare('UPDATE users SET last_login_at = ?1 WHERE id = ?2')
          .bind(now, body.user_id)
          .run()
        await deleteChallenge(env, body.request_id)

        return jsonWithSession({ ok: true, user_id: body.user_id }, body.user_id, env)
      }

      if (request.method === 'POST' && pathname === '/auth/login/start') {
        const body = await readJson<{ user_id?: string }>(request)
        const userId = body.user_id || null

        let allowCredentials: Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials']
        if (userId) {
          const credentials = await env.DB.prepare(
            'SELECT id, transports FROM webauthn_credentials WHERE user_id = ?1',
          )
            .bind(userId)
            .all<{ id: string; transports: string | null }>()
          allowCredentials = (credentials.results || []).map((item) => ({
            id: item.id,
            transports: item.transports ? JSON.parse(item.transports) : undefined,
          })) as Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials']
        }

        const options = await generateAuthenticationOptions({
          rpID: env.RP_ID,
          userVerification: 'preferred',
          allowCredentials,
        })

        const requestId = crypto.randomUUID()
        await saveChallenge(env, {
          id: requestId,
          user_id: userId,
          challenge: options.challenge,
          purpose: 'login',
          expires_at: Date.now() + CHALLENGE_TTL_MS,
        })

        return jsonResponse({ request_id: requestId, options }, 200, env)
      }

      if (request.method === 'POST' && pathname === '/auth/login/finish') {
        const body = await readJson<{
          request_id: string
          credential: { id: string }
        }>(request)
        const challenge = await getChallenge(env, body.request_id, 'login')
        if (!challenge) return errorResponse('Challenge expired', 400, env)

        const credential = await env.DB.prepare(
          'SELECT id, user_id, public_key, counter, transports FROM webauthn_credentials WHERE id = ?1',
        )
          .bind(body.credential.id)
          .first<{
            id: string
            user_id: string
            public_key: string
            counter: number
            transports: string | null
          }>()
        if (!credential) return errorResponse('Credential not found', 404, env)

        const verification = await verifyAuthenticationResponse({
          response: body.credential as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
          expectedChallenge: challenge.challenge,
          expectedOrigin: env.ORIGIN,
          expectedRPID: env.RP_ID,
          credential: {
            id: credential.id,
            publicKey: base64UrlToBytes(credential.public_key),
            counter: credential.counter,
            transports: credential.transports
              ? (JSON.parse(credential.transports) as Parameters<
                  typeof verifyAuthenticationResponse
                >[0]['credential']['transports'])
              : [],
          },
          requireUserVerification: false,
        })

        if (!verification.verified) return errorResponse('Passkey sign-in failed', 400, env)

        const nextCounter = (
          verification.authenticationInfo as { newCounter?: number; credential?: { counter?: number } }
        ).newCounter ??
          (verification.authenticationInfo as { credential?: { counter?: number } }).credential
            ?.counter ??
          credential.counter

        const now = Date.now()
        await env.DB.prepare(
          'UPDATE webauthn_credentials SET counter = ?1, last_used_at = ?2 WHERE id = ?3',
        )
          .bind(nextCounter, now, credential.id)
          .run()
        await env.DB.prepare('UPDATE users SET last_login_at = ?1 WHERE id = ?2')
          .bind(now, credential.user_id)
          .run()
        await deleteChallenge(env, body.request_id)

        return jsonWithSession({ ok: true, user_id: credential.user_id }, credential.user_id, env)
      }

      if (request.method === 'POST' && pathname === '/auth/logout') {
        return jsonResponse(
          { ok: true },
          200,
          env,
          `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        )
      }

      if (request.method === 'GET' && pathname === '/me') {
        const session = await getSessionFromRequest(request, env)
        if (!session) return errorResponse('Unauthorized', 401, env)
        return jsonResponse({ user_id: session.user_id }, 200, env)
      }

      if (request.method === 'GET' && pathname === '/vault') {
        const session = await getSessionFromRequest(request, env)
        if (!session) return errorResponse('Unauthorized', 401, env)
        const row = await env.DB.prepare(
          'SELECT ciphertext, salt, version, updated_at FROM vault WHERE user_id = ?1',
        )
          .bind(session.user_id)
          .first<{
            ciphertext: string
            salt: string
            version: number
            updated_at: number
          }>()
        return jsonResponse(row || null, 200, env)
      }

      if (request.method === 'PUT' && pathname === '/vault') {
        const session = await getSessionFromRequest(request, env)
        if (!session) return errorResponse('Unauthorized', 401, env)
        const body = await readJson<{
          ciphertext: string
          salt: string
          version: number
        }>(request)
        const existing = await env.DB.prepare('SELECT version FROM vault WHERE user_id = ?1')
          .bind(session.user_id)
          .first<{ version: number }>()
        if (existing && body.version <= existing.version) {
          return jsonResponse(
            {
              error: 'conflict',
              server_version: existing.version,
            },
            409,
            env,
          )
        }

        const now = Date.now()
        await env.DB.prepare(
          'INSERT INTO vault (user_id, ciphertext, salt, version, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(user_id) DO UPDATE SET ciphertext = excluded.ciphertext, salt = excluded.salt, version = excluded.version, updated_at = excluded.updated_at',
        )
          .bind(session.user_id, body.ciphertext, body.salt, body.version, now)
          .run()
        return jsonResponse({ ok: true, version: body.version, updated_at: now }, 200, env)
      }

      return errorResponse('Not found', 404, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error'
      return errorResponse(message, 500, env)
    }
  },
}

function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  }
}

function jsonResponse(data: unknown, status: number, env: Env, cookie?: string) {
  const headers: Record<string, string> = {
    ...corsHeaders(env),
    'Content-Type': 'application/json',
  }
  if (cookie) headers['Set-Cookie'] = cookie
  return new Response(JSON.stringify(data), {
    status,
    headers,
  })
}

function errorResponse(message: string, status: number, env: Env) {
  return jsonResponse({ error: message }, status, env)
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

async function saveChallenge(env: Env, challenge: ChallengeRecord) {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO auth_challenges (id, user_id, challenge, purpose, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
  )
    .bind(
      challenge.id,
      challenge.user_id,
      challenge.challenge,
      challenge.purpose,
      challenge.expires_at,
      Date.now(),
    )
    .run()
}

async function getChallenge(env: Env, id: string, purpose: string) {
  const row = await env.DB.prepare(
    'SELECT id, user_id, challenge, purpose, expires_at FROM auth_challenges WHERE id = ?1',
  )
    .bind(id)
    .first<ChallengeRecord>()
  if (!row) return null
  if (row.purpose !== purpose) return null
  if (row.expires_at < Date.now()) {
    await deleteChallenge(env, id)
    return null
  }
  return row
}

async function deleteChallenge(env: Env, id: string) {
  await env.DB.prepare('DELETE FROM auth_challenges WHERE id = ?1').bind(id).run()
}

function parseCookies(value: string | null) {
  if (!value) return {}
  return value.split(';').reduce<Record<string, string>>((acc, item) => {
    const [key, ...rest] = item.trim().split('=')
    acc[key] = rest.join('=')
    return acc
  }, {})
}

async function signSession(payload: SessionPayload, secret: string) {
  const payloadBytes = textEncoder.encode(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)
  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(new Uint8Array(signature))}`
}

async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return null
  const payloadBytes = base64UrlToBytes(payloadPart)
  const signatureBytes = base64UrlToBytes(signaturePart)
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const verified = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
  if (!verified) return null
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

async function getSessionFromRequest(request: Request, env: Env) {
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME]
  if (!token) return null
  return verifySession(token, env.SESSION_SECRET)
}

async function jsonWithSession(data: unknown, userId: string, env: Env) {
  const session: SessionPayload = {
    user_id: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const token = await signSession(session, env.SESSION_SECRET)
  const cookie = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
  return jsonResponse(data, 200, env, cookie)
}

function normalizeCredentialField(value: Uint8Array | string | undefined) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return bytesToBase64Url(value)
}

function base64UrlToBytes(value: string) {
  const padLength = (4 - (value.length % 4)) % 4
  const normalized = `${value.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat(padLength)}`
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64Url(value: Uint8Array | ArrayBuffer | undefined) {
  if (!value) return ''
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
