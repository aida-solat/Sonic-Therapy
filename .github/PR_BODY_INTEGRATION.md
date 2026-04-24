Integrates the Python audio-analysis microservice into the TypeScript core API and documents it in the OpenAPI contract.

## What it does

After a track is generated (therapy or standard) and uploaded to storage, the core API fires a **fire-and-forget** call to the Python service with the storage URL, target BPM, and target brainwave Hz. The service downloads the track, extracts objective acoustic features, and the result is written back to the track row. **User-facing track delivery is never blocked** — analysis runs asynchronously and failures are persisted as `audio_analysis_status='failed'` for later retry.

## Changes

### Backend (TypeScript)
- **`supabase/migrations/0008_add_audio_analysis.sql`** — adds `audio_analysis` (jsonb), `audio_analysis_score` (real), `audio_analysis_status` (text), `audio_analysis_at` (timestamptz) columns + two supporting indexes
- **`src/config/env.ts`** — new `AUDIO_ANALYSIS_URL` (optional) and `AUDIO_ANALYSIS_TIMEOUT_MS` (default 45s) env vars
- **`src/types/domain.ts`** — new `AudioAnalysisResult`, `AudioAnalysisStatus`, `AudioAnalysisRecommendation` types; extended `TrackMetadata`
- **`src/services/audioAnalysis/audioAnalysisClient.ts`** — fetch-based client with timeout, snake_case→camelCase mapping, graceful degradation when service is disabled
- **`src/services/audioAnalysis/audioAnalysisService.ts`** — orchestrator with `triggerInBackground()` (fire-and-forget) and `runAndPersist()` (awaitable). Both handle all errors internally.
- **`src/services/tracks/trackMetadataService.ts`** — new `updateAudioAnalysis()` method writes the full JSONB payload + flat score + timestamp + status
- **`src/services/therapy/generateTherapyTrackService.ts`** — triggers analysis with `targetBpm` + `targetBrainwaveHz` after track metadata is saved
- **`src/services/tracks/generateTrackService.ts`** — triggers analysis with just `targetBpm` for standard tracks

### OpenAPI
- New schemas: `AudioAnalysisSpectral`, `AudioAnalysisDynamics`, `AudioAnalysisTherapy`, `AudioAnalysisResult`
- `AccountTrackItem` extended with `audioAnalysis`, `audioAnalysisScore`, `audioAnalysisStatus`, `audioAnalysisAt` fields
- Schema count: 21 → 25

## Design decisions

- **Fire-and-forget, not queue-based**: Analysis is best-effort enrichment, not a critical path. A Redis/BullMQ queue would be overkill at current scale. The DB status field + indexes are enough to build a retry cron later if needed.
- **Service URL via env, not service discovery**: `AUDIO_ANALYSIS_URL` is optional — if unset, tracks get `audio_analysis_status='skipped'` and everything else works normally. Zero impact on local dev or environments without the Python service.
- **10-min signed URL**: Python service has time to finish even with cold starts on Render free plan.
- **45s default timeout**: librosa cold start on Render free can take ~15-30s; 45s leaves headroom.

## Validation

- ✅ `pnpm typecheck` — passes
- ✅ `pnpm lint` — 0 errors (pre-existing warnings only)
- ✅ `pnpm build` — passes
- ✅ `pnpm web:typecheck` + `web:build` — passes
- ✅ OpenAPI YAML parses cleanly (25 schemas, 11 paths)
