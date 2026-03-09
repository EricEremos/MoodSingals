# MoodSignals — Local-First Mood x Money Coaching

MoodSignals is a local-first React app for understanding the chain of **emotion -> spending -> outcome** from quick logs, CSV imports, and deterministic insight cards.

The app now has a stronger service layer built around two principles:
- **Keep core analytics local and deterministic**
- **Use remote services only for coaching and manual backup**

## What Runs Where
### Local-only by default
- Mood logs, spend moments, imported transactions, and insight-card computation stay in IndexedDB.
- CSV parsing, normalization, and confidence scoring remain local.
- The app still works without Supabase auth or remote backups.

### Remote services
- `GET /api/health`: safe readiness check for generation + Supabase server config
- `POST /api/ai/reflect`: structured coaching reflection from a derived insight digest
- `POST /api/ai/weekly-plan`: structured weekly plan from the same digest
- `GET /api/backups`: list manual backups for the signed-in user
- `POST /api/backups`: create a manual backup snapshot in Supabase
- `GET /api/backups/:id`: fetch a backup and restore it locally

## AI Service Design
The generation model is used only for **narrative coaching**:
- explain what the local cards suggest
- propose concrete next actions
- build a short weekly plan

The model is **not** used for:
- CSV mapping
- transaction parsing
- mood linkage
- confidence scoring
- replacing deterministic insight logic

The server sends only a compact `InsightDigest` built from local cards, not the raw CSV file.

## Backup Design
Manual backup uses Supabase email auth plus a server-side snapshot API.

- Local Dexie remains the working source of truth.
- A backup stores the exported JSON snapshot shape plus metadata.
- Restore replaces local device data only after explicit confirmation.
- Supabase schema is included in `supabase/schema.sql`.
- Backup and reflection writes run with the signed-in user's Supabase session under RLS.
- A service-role key is optional for future admin-only operations, not required for standard backup flow.

## Environment Variables
### Server-side
```bash
GENERATION_API_KEY=...
GENERATION_API_URL=...
GENERATION_MODEL=...
GENERATION_PROVIDER_NAME=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Client-side public auth config
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

A template is included in `.env.example`.

## Local Development
```bash
npm install
npm run dev
```

The Vite dev server also serves the `/api/*` routes locally.

## Supabase Setup
1. Create or use a Supabase project.
2. Add `SUPABASE_URL` plus either `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the server runtime.
3. Add the public auth env vars for the browser.
4. Run the SQL in `supabase/schema.sql`.
5. Enable email auth in Supabase.

## Verification Commands
```bash
npm run build
npm run test
```

`npm run lint` still includes older repo issues outside the new service work.
