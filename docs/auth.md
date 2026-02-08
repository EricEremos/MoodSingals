# MoodSignals Auth and Sync Plan

## Decision
- IdP: **Supabase Auth**
- Why: lowest setup and maintenance for Google, Apple, and Kakao social login.
- MVP status: local-only by default, no required login.
- V2 status: optional sign-in and sync behind `VITE_ENABLE_SYNC`.

## MVP Rules
- Data stays on the device by default (IndexedDB via Dexie).
- No personal records are stored on a server in MVP.
- Cross-device movement in MVP uses user-triggered JSON export/import.

## V2 OAuth Redirect Architecture
1. User taps social sign-in in `Settings -> Account & Sync`.
2. App redirects to Supabase Auth hosted OAuth flow.
3. OAuth provider returns to Pages callback route (for example `/auth/callback`).
4. Frontend exchanges auth code for session token via Supabase SDK.
5. Frontend calls Cloudflare Worker sync endpoints with bearer token.
6. Worker validates Supabase JWT (JWKS / issuer / audience checks).
7. Worker resolves `user_id` and handles encrypted sync blob storage.

## Privacy Stance
- Sync data is encrypted **before upload** on the client.
- Workers/D1 store ciphertext only.
- Server cannot read mood logs or transaction content.
- If user loses their encryption passphrase/key material, data cannot be recovered.

## Sync Data Model (V2)
Use **D1 only** for compact encrypted payload storage.

Suggested table:
- `sync_vaults`
- columns:
  - `user_id TEXT PRIMARY KEY`
  - `ciphertext TEXT NOT NULL`
  - `salt TEXT NOT NULL`
  - `version INTEGER NOT NULL`
  - `updated_at INTEGER NOT NULL`

Payload semantics:
- `ciphertext` contains encrypted JSON snapshot (transactions, moods, spends, tags, and preferences).
- `version` is monotonically increasing for conflict-safe writes.

## Worker Endpoints (Placeholders to Implement)

### `POST /api/sync/push`
- Auth required: valid Supabase JWT.
- Body:
  - `ciphertext: string`
  - `salt: string`
  - `version: number`
- Behavior:
  - validate token and payload
  - upsert encrypted blob for `user_id`
  - reject stale version writes
- Response:
  - `200 { ok: true, version, updated_at }`

### `GET /api/sync/pull`
- Auth required: valid Supabase JWT.
- Behavior:
  - return latest encrypted blob for `user_id`
- Response:
  - `200 { ciphertext, salt, version, updated_at }` or `200 { data: null }`

### `POST /api/sync/logout`
- Auth required: optional (token can be present).
- Behavior:
  - frontend clears local auth/session state
  - worker returns success placeholder
- Response:
  - `200 { ok: true }`

## Frontend Flag Contract
- `VITE_ENABLE_SYNC=false` (default):
  - show local-only mode
  - show sync controls disabled
- `VITE_ENABLE_SYNC=true`:
  - enable sign-in UI controls
  - still show "coming soon" until worker endpoints are live
