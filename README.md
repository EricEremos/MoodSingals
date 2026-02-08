# MoodSignals — Ledger + Mood Notes

MoodSignals is a local-first spending ledger where users can attach fast mood notes to purchases. Insights are descriptive pattern signals, not diagnosis.

## Product Model
- Default surface: **Ledger** (`/`) with transaction rows + optional mood notes.
- Mood linkage:
  - `DIRECT`: manual mood tag on transaction.
  - `INFERRED`: nearest mood in `[-2h, +6h]`.
  - `UNLINKED`: no link.
- Internal valence/arousal is stored silently; UI stays plain language.

## Stack
- Frontend: React + TypeScript + Vite on Cloudflare Pages
- Local data: IndexedDB via Dexie
- Optional sync backend: Cloudflare Workers + D1
- Optional encrypted sync: client-side AES-GCM via WebCrypto (passphrase-derived key)

## Index Standard v1
All Insight Cards use `IndexSpec` with runtime validation (`src/data/indices/types.ts`) and include:
- id, name, user_question, construct
- primary_inputs, matching_rule, formula, units
- normalization (within-user by default), minimum_data
- confidence mapping function with low/medium/high
- limitations, citations, validation_plan, change_log

Supporting files:
- Evidence library: `src/data/indices/evidence.ts`
- Spec registry + runtime validation: `src/data/indices/specs/index.ts`
- Markdown renderer: `src/data/indices/markdown.ts`

Current 8-card set:
1. Mood -> Spend Heatmap
2. Impulse Risk Proxy
3. Late-Night Leak
4. Top 3 Emotional Triggers
5. Comfort Spend Pattern
6. Worth-It Spend Anchors
7. Weekly Drift
8. Readiness + Coverage

## Local Development
```bash
npm install
npm run dev
```

## Optional Encrypted Sync (Cloudflare)

Worker project:
- Location: `cloudflare/worker`
- D1 migration: `cloudflare/worker/migrations/0001_init.sql`
- Worker routes:
  - `POST /auth/register/start`
  - `POST /auth/register/finish`
  - `POST /auth/login/start`
  - `POST /auth/login/finish`
  - `POST /auth/logout`
  - `GET /me`
  - `GET /vault`
  - `PUT /vault`

Setup:
```bash
cd cloudflare/worker
npm install
```

Configure `cloudflare/worker/wrangler.toml`:
- set `database_id`
- set `RP_ID`, `RP_NAME`, `ORIGIN`
- set secret:
```bash
wrangler secret put SESSION_SECRET
```

Frontend API base:
- set `VITE_SYNC_API_BASE` (defaults to `/api`)

## Study Mode
- Route: `/study-mode`
- Tracks:
  - task accuracy/time/confidence
  - A/B variant (`card-feed` vs `dashboard`)
  - retention proxies (mood streak + session count)
  - readiness deltas (moods/spend/tagged)
- Exports one-page HTML report.

## Manual QA Checklist
1. Import CSV, open Ledger, confirm rows render.
2. Tag one transaction (`+ Mood`), edit it, then delete it; confirm cards update immediately.
3. Run `Tag 5 purchases` and finish in under 2 minutes.
4. At 390px width, confirm ledger rows and mood modal fit with no overflow.
5. After tagging >=10 purchases, verify at least 3 cards are `Med` or `High`.
6. Confirm card `Evidence & limits` shows citation ids and limitations.
7. Confirm no clinical or moralizing wording in surfaced UI copy.
8. If Worker is configured: create passkey, set sync passphrase, `Sync now`, refresh, `Restore latest`, verify history returns.
