## Phase 0 Architecture Map

- Runtime: React + TypeScript SPA built by Vite and deployed on Cloudflare Pages.
- Routing: `src/app/routes.tsx` with top-level pages for Insights, Today, Timeline, Data, and Settings.
- App shell: `src/App.tsx` provides global chrome, help entry, onboarding modal, and primary navigation.
- Storage: Dexie/IndexedDB in `src/data/db.ts` with local-only persistence for moods, spend moments, imports, transactions, and annotations.
- Import pipeline: CSV parsing in `src/data/import/parse.worker.ts`, mapping + normalization in `src/data/import/*`, persisted via Dexie.
- Insight engine: card computations in `src/data/insights/cards/*` plus confidence/evidence helpers in `src/data/insights/*`.
- Visualization: mini charts via `src/components/Charts/index.tsx` (uPlot lazy import + SVG fallbacks).
- UX components: cards, wizard, check-ins, onboarding, and info sheets in `src/components/*`.
- Sync posture: optional V2 scaffolding only (feature flag + docs), no mandatory backend for MVP.
