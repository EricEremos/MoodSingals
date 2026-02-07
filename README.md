# MoodSignals — Emotion-Based Budget Tracker (Local-First)

Local-first analytics app for understanding the chain of **Emotion → Spend → Outcome Proxy** using your own CSV data and quick mood check-ins. All parsing, storage, and insights run **entirely in the browser**. No backend. No accounts. No data leaves your device.

## Why Local-First
- **Privacy-first:** CSV data never leaves the browser.
- **Offline-capable:** Works as a static app on Cloudflare Pages.
- **Low-ops:** No backend infrastructure required.

## Architecture (MVP)
- **Cloudflare Pages + React (Vite) + TypeScript**
- **IndexedDB via Dexie** for local storage
- **CSV parsing in Web Worker via PapaParse** (no UI freeze)
- **Compute in browser**, lazy-loaded charts

## Core MVP Constraints
- CSV upload only (no bank APIs)
- 8 Insight Cards with confidence + explanation
- Mood logging <10 seconds, 1–3 check-ins/day
- Privacy controls: delete/export, sensitive-data disclaimers
- Static deploy on Cloudflare Pages (no backend)

## CSV Import Pipeline
- Runs in **Web Worker** with **chunked parsing**
- **Progress updates** back to UI
- Normalize to canonical schema
- **IndexedDB writes in chunks** (default 750 rows)
- Error states and recovery actions in wizard

### Mapping Wizard V1
- Upload CSV → preview 20 rows
- Map columns: date/datetime, amount, merchant, description, category (optional), currency (optional)
- Validation: date parse failures count, amount parse failures count
- Heuristics:
  - Detect delimiter
  - Detect sign convention (if >70% negative, treat negative as outflow; toggleable)
  - Default timezone = browser timezone
  - Default category = "Uncategorized"

## Insight Engine
Linking rule:
- Transaction links to most recent mood in past **6 hours**
- If `time_unknown`, link to same-day earlier mood only

Confidence:
- High/Med/Low based on sample size + missingness + time-unknown rate

Required cards:
- Mood → Spend heatmap
- Stress trigger categories (Top 3)
- Late-night leak (22–02)
- Impulse risk proxy (high arousal + low valence)
- Comfort spend after low mood
- Happy spend anchors
- Weekday drift
- Unlinked spend share

## Privacy & Controls
- Delete all data
- Delete by import batch
- Export all data (JSON + CSV)
- Supportive copy, no diagnosis framing

## Performance Instrumentation
Hidden Debug page (Settings → Debug):
- `parse_ms`, `normalize_ms`, `db_write_ms`, `compute_ms`
- `row_count`, `file_size_mb`, `time_unknown_pct`

## Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`

## Local Development
```bash
npm install
npm run dev
```

## Sources (Background)
The MVP design is aligned with widely used local-first patterns: client-side CSV parsing with PapaParse (Worker + streaming), IndexedDB via Dexie for persistent storage, and lightweight charting (uPlot for performance). These are summarized in docs and demo repositories across the ecosystem (e.g., local-first budgeting apps, offline-first expense trackers, and IndexedDB performance guidance).
