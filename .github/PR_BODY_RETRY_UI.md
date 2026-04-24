Adds two closely-related features on top of the audio-analysis microservice integration:

1. **Admin retry endpoint** — `POST /api/admin/retry-failed-analyses` to re-run analysis on tracks whose status is `failed` or stuck at `pending`.
2. **Studio UI badge** — surfaces objective audio analysis outcomes directly on every track card in the library.

## Backend

### `POST /api/admin/retry-failed-analyses`

Protected by a new `ADMIN_API_KEY` env var, passed via the `x-admin-key` request header (constant-time compared to avoid timing attacks).

- **Behavior**: queries tracks with `audio_analysis_status IN (statuses)` older than `minAgeSeconds` (default 120 s — avoids racing with in-flight analyses), loops and calls `audioAnalysisService.runAndPersist()` on each.
- **Body params** (all optional): `limit` (1..500, default 50), `minAgeSeconds` (0..86400, default 120), `statuses` (`['failed']`, `['pending']`, or both — default both).
- **Returns**: `{ totalCandidates, attempted, succeeded, failed, skipped, trackIds }`.
- **Disabled gracefully** when `ADMIN_API_KEY` is not set (503 with clear error code `admin_disabled`).

Cron usage example — Render cron job or GitHub Actions schedule:
```bash
curl -sSf -X POST \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{"limit":100,"statuses":["failed","pending"]}' \
  https://sonic.deciwa.com/api/admin/retry-failed-analyses
```

### `GET /api/account/tracks` — extended response

Now includes `audioAnalysis`, `audioAnalysisScore`, `audioAnalysisStatus`, `audioAnalysisAt` per track (opt-in — fields are nullable and default to sensible values when the analysis service is disabled).

## Frontend

### New `AudioAnalysisBadge` component

- **`completed`** → color-coded recommendation badge (excellent = success, good = info, acceptable = warning, poor = error) with `therapyFitScore` percentage and rich tooltip showing tempo, key, and low-frequency energy.
- **`pending`** → neutral "Analyzing…" chip with subtle pulse animation.
- **`failed`** → warning chip explaining a retry will run.
- **`skipped`** → renders nothing (service disabled on deployment).

Rendered inline in the existing metadata chip row of every track card in the studio library.

## Files changed

- `src/config/env.ts` — new `ADMIN_API_KEY` optional env var
- `src/services/audioAnalysis/retryFailedAnalysesService.ts` — new service
- `src/routes/admin.route.ts` — new admin-authenticated route
- `src/schemas/admin.schema.ts` — request/response schemas
- `src/app.ts` — registers the admin route
- `src/services/tracks/listTracksService.ts` — selects + returns new analysis columns
- `src/schemas/account.schema.ts` — extended Fastify response schema
- `web/lib/types.ts` — new AudioAnalysis* types + extended `AccountTrackItem`
- `web/components/audio-analysis-badge.tsx` — new component
- `web/components/dashboard-app.tsx` — imports and renders the badge

## Validation

- ✅ `pnpm typecheck` — passes (backend)
- ✅ `pnpm web:typecheck` — passes (frontend)
- ✅ `pnpm lint` — 0 errors (existing warnings only)
- ✅ `pnpm build` + `pnpm web:build` — both pass

## Notes for the operator

- The `audio_analysis_*` columns are populated by migration `0008_add_audio_analysis.sql`, included in the previous PR.
- Set `ADMIN_API_KEY` in the Render service env (a long random string) before calling the retry endpoint in production.
- Recommended cron cadence: every 10 minutes with `{limit:100, statuses:["failed","pending"]}`.
