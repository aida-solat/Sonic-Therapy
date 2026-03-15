# Architecture Decision Records (ADR)

This document records key architectural decisions for the Sonic Therapy Platform.

Each ADR includes: **Context**, **Decision**, **Status**, and **Consequences**.

---

## ADR-001 – Backend Stack: Node.js 24 + Fastify + TypeScript

- **Status:** Accepted
- **Context:**
  - Need for a lightweight, fast backend suitable for an API-first approach.
  - Rich ecosystem for TypeScript and modern libraries.
- **Decision:**
  - Use **Node.js 24** as the runtime.
  - Use **Fastify** as the HTTP framework.
  - Use **TypeScript** for type-safety and better DX.
- **Consequences:**
  - Enables building fast APIs with Fastify plugins.
  - Slightly higher learning curve for developers unfamiliar with TypeScript.

---

## ADR-002 – Supabase (Postgres + Auth + Storage) as the Primary Platform

- **Status:** Accepted
- **Context:**
  - Need for an integrated solution for DB, Auth, and Storage without complex infrastructure management.
  - The MVP must launch quickly while retaining the ability to scale in the future.
- **Decision:**
  - Use **Supabase** for:
    - Postgres database.
    - Auth and user management (as needed).
    - Storage for audio files and watermark assets.
- **Consequences:**
  - Reduced initial complexity (no need to manage separate Postgres + S3 + Auth).
  - To migrate to self-hosted infrastructure or another cloud provider, the Storage/DB layer must be designed with proper abstractions (covered in soft-design).

---

## ADR-003 – No Redis or Job Queue in v1 (MVP)

- **Status:** Accepted (for v1)
- **Context:**
  - Redis and BullMQ add architectural complexity.
  - Expected initial traffic volume and latency are relatively low.
  - The goal is to build the MVP with minimal infrastructure components.
- **Decision:**
  - In **v1**, Redis will not be used for rate limiting and BullMQ (or similar queues) will not be used for async jobs.
  - Daily quota management is handled solely through **Supabase Postgres** and the `UsageDaily` table.
- **Consequences:**
  - Simpler architecture and easier deployment.
  - For very high traffic and short-term rate limiting needs, Redis or a similar service should be added in the future (noted as Future in soft-design).
  - In v1, concurrency peaks are managed via **transaction-level locking** in Postgres on the `UsageDaily` table (details in ADR-008).

---

## ADR-004 – Storage: Supabase Storage Bucket as the Primary Source for Audio Files

- **Status:** Accepted
- **Context:**
  - Need for secure storage of MP3/WAV files with the ability to generate Signed URLs.
  - Alignment with the choice of Supabase as the platform.
- **Decision:**
  - Store all generated tracks and watermark files in a **Supabase Storage bucket**.
  - Use Signed URLs with a limited TTL for downloads.
- **Consequences:**
  - Simplicity in file management and access control.
  - For potential migration to S3 or another cloud storage, `storage_path` and the Storage abstraction layer must be designed so the API remains unchanged (explained in soft-design).

---

## ADR-005 – Audio Provider in v1: Single Provider (OpenAI Audio or Suno)

- **Status:** Accepted (single provider in v1)
- **Context:**
  - Supporting multiple providers simultaneously in the first version increases complexity and testing surface.
  - The MVP needs a reliable provider for generating ambient music.
- **Decision:**
  - In **v1**, only **one audio provider** (e.g., OpenAI Audio or Suno) will be used.
  - A `provider` field is stored in metadata so that multi-provider support and fallback can be added in **v2**.
- **Consequences:**
  - Simpler implementation with focus on a single integration.
  - Flexibility to add additional providers in the v2 roadmap (along with a `provider_version` field).

---

## ADR-006 – Quota Model and Revenue Plans (Free/Basic/Pro/Ultra)

- **Status:** Accepted
- **Context:**
  - Need for a simple yet extensible model for API consumption and monetization.
- **Decision:**
  - Plans are defined as follows:
    - **Free:** 1 request per day, watermarked output.
    - **Basic (€9/month):** 5 requests per day, MP3 192kbps.
    - **Pro (€19/month):** 20 requests per day, MP3 + WAV, higher priority.
    - **Ultra (€49/month):** 100 requests per day, commercial license.
  - The plan is stored in the `User` table, and the `UsageDaily` table is used to enforce daily quotas.
- **Consequences:**
  - Simplicity in initial implementation.
  - Daily quota resets at **midnight UTC** (00:00:00 UTC); in the future, user timezone support can be added if needed.
  - If more complex subscription history is needed, a separate `Subscription` table can be added in the future without breaking the API.

---

## ADR-007 – Watermarking for the Free Plan

- **Status:** Accepted
- **Context:**
  - The Free plan should produce usable but limited output to incentivize upgrades.
- **Decision:**
  - Use a **static watermark file** (e.g., a short WAV) stored in Supabase Storage, mixed onto the final track in the last 3–5 seconds using ffmpeg.
  - The output metadata includes `watermarked` and `commercial_license` fields.
- **Consequences:**
  - Simple control over Free plan behavior.
  - Clients can easily determine whether a track is suitable for commercial use.

---

## ADR-008 – UsageDaily in DB Instead of Redis for Quota Management in v1

- **Status:** Accepted (for v1)
- **Context:**
  - The goal is to manage daily quotas without adding Redis.
  - Consistency is critical (prevent double-counting requests during concurrent calls).
- **Decision:**
  - Define a `UsageDaily` table with columns `user_id`, `date`, `requests_count` and a `UNIQUE(user_id, date)` constraint.
  - Before each `generate` call, a transaction is opened and the `(user_id, date)` record is updated via upsert + lock.
- **Consequences:**
  - Requires careful transaction design in the DB layer.
  - If traffic grows significantly, Redis or another rate limiter should be added in the future (noted as Future in soft-design).

---

## ADR-009 – Standardized Error Response Structure

- **Status:** Accepted
- **Context:**
  - Client developers need a stable and reliable error model.
- **Decision:**
  - All endpoints return errors in the following structure:
    ```json
    {
      "error": {
        "code": "quota_exceeded",
        "message": "Daily quota exceeded for this plan",
        "status": 429
      }
    }
    ```
  - `code` is for machines and documentation, `message` is for humans, and `status` mirrors the HTTP status code.
- **Consequences:**
  - Better DX for API consumers.
  - All errors must be normalized to this format in the API layer.

---

## ADR-010 – Synchronous Generation in v1 with Async Readiness for v2

- **Status:** Accepted (for v1)
- **Context:**
  - For the MVP, the simplest UX is a blocking `generate` request that returns output directly.
  - In the future, model latency may increase or traffic volume may grow significantly.
- **Decision:**
  - In **v1**, `POST /api/generate` is a **synchronous** operation and the response `status` is always `"completed"`.
  - In **v2**, an async pattern with a job queue and status endpoint is planned, and the `status` field is ready for `pending`/`processing` values.
  - A suggested pattern for v2 is adding an endpoint like `GET /api/generate/:id/status` for job status polling (or returning status in `GET /api/tracks/:id`).
- **Consequences:**
  - Simpler implementation in v1.
  - Ability to migrate to async in the future without major changes to the response contract.

---

## ADR-011 – Product Surface Includes a Dashboard and API

- **Status:** Accepted
- **Context:**
  - The repository now serves both developer-facing API consumers and authenticated end users.
  - A browser-based surface improves demoability, onboarding, and billing/account operations.
- **Decision:**
  - The product includes both an **HTTP API** and a **Next.js dashboard**.
  - `/api/generate`, `/api/me`, and `/api/keys` remain API-key driven for programmatic use.
  - `/api/account/*` is protected by Supabase session bearer tokens for dashboard operations.
- **Consequences:**
  - The project demonstrates a fuller product architecture instead of an API-only slice.
  - The auth model is intentionally split and must remain clearly documented to avoid confusion.

---

## ADR-012 – Intelligent Prompt Engine with Mood/Style Descriptors

- **Status:** Accepted
- **Context:**
  - The original prompt engine used a static template that produced similar-sounding outputs regardless of mood/style combination.
  - Users expect "romantic jazz" to sound fundamentally different from "calm ambient."
- **Decision:**
  - Redesign the prompt engine with **mood-specific descriptors** (e.g., romantic → "warm harmonies, gentle swells") and **style-specific descriptors** (e.g., jazz → "gentle swing rhythms, soft brushed drums").
  - Include intensity-aware dynamics (soft/medium/high affect layering and percussion).
  - Each prompt dynamically combines mood descriptors, style descriptors, tempo, length, and intensity into a unique generation instruction.
- **Consequences:**
  - Distinct outputs for each mood/style combination.
  - Adding new moods or styles requires only adding descriptor entries, not changing the engine logic.

---

## ADR-013 – API Key Deletion via Dashboard and API

- **Status:** Accepted
- **Context:**
  - Users could create API keys but had no way to revoke or delete them from the dashboard.
  - Security best practice requires key lifecycle management.
- **Decision:**
  - Add a `DELETE /api/account/keys/:keyId` endpoint.
  - Add a delete button on each API key card in the dashboard.
  - CORS configuration updated to allow the DELETE method.
  - Local state is updated immediately on deletion for instant UI feedback.
- **Consequences:**
  - Full API key lifecycle: create, select, delete.
  - CORS must explicitly include DELETE in allowed methods.

---

## ADR-014 – Dashboard UX: Generation Progress, Exclusive Playback, Library Filters

- **Status:** Accepted
- **Context:**
  - Music generation can take 20–90+ seconds depending on track length.
  - Users could play multiple tracks simultaneously, causing audio confusion.
  - With many tracks, the library became hard to navigate.
- **Decision:**
  - **Progress bar:** Show simulated progress with percentage and estimated time remaining during generation. The estimate is based on track length. Progress uses an ease-out curve and caps at 92% until generation completes.
  - **Exclusive playback:** When a track starts playing, all other audio elements are automatically paused via refs.
  - **Library filters:** Add search input (matches mood, style, tempo, duration, plan, intensity), mood dropdown filter, and style dropdown filter.
  - **Pagination:** Show only 3 tracks initially with a "Load more" button. Expanded view uses a scrollable container with `max-h-[600px]`.
  - **Form disabling:** All generation inputs are disabled during generation to prevent parameter changes mid-request.
- **Consequences:**
  - Significantly improved UX for long generation times.
  - Clean audio experience with no overlapping playback.
  - Library remains usable as track count grows.

---

## ADR-015 – Deciwa Branding and Custom Theme

- **Status:** Accepted
- **Context:**
  - The project is a portfolio piece for Deciwa, a one-person engineering studio.
  - The UI should reflect professional quality and consistent branding.
- **Decision:**
  - Use a custom DaisyUI theme (`ambient`) with a dark navy background and gold (`#d4af37`) as the primary color.
  - All borders use a warm gold-tinted color (`#3a3222`) with thin `0.5px` width for subtlety.
  - Focus states on inputs/selects use gold border and ring.
  - "Designed & built by Deciwa" footer on the dashboard.
- **Consequences:**
  - Consistent, professional visual identity across the product.
  - The theme is centralized in `web/app/globals.css` for easy updates.

---

## ADR-016 – Multi-Model Provider Architecture with Automatic Fallback

- **Status:** Accepted
- **Context:**
  - Relying on a single audio generation provider creates a single point of failure.
  - Different providers have different strengths (MusicGen for music-specific quality, OpenAI for reliability).
- **Decision:**
  - Implement a `MultiProviderWithFallback` orchestrator that tries providers in priority order.
  - Log latency and success/failure for each attempt to enable data-driven provider selection.
  - Current providers: Replicate MusicGen (primary, priority 1) and OpenAI Audio (fallback, priority 2).
  - New providers can be added by implementing the `AudioProvider` interface and registering them.
- **Consequences:**
  - Service remains available even if the primary provider is down.
  - Latency data enables informed decisions about provider priority.
  - Adding new providers requires zero changes to orchestration logic.

---

## ADR-017 – RAG-Augmented Prompt Retrieval

- **Status:** Accepted
- **Context:**
  - Static prompt descriptors, while better than templates, don't capture detailed production techniques.
  - A knowledge base of musical fragments could improve prompt specificity.
- **Decision:**
  - Implement a lightweight, in-memory RAG component (`promptRetrieval.ts`).
  - Maintain a curated knowledge base of 20+ musical production fragments, each tagged with moods/styles/intensities.
  - Use bag-of-tags embeddings with IDF weighting and cosine similarity for retrieval.
  - Retrieve top-3 most relevant fragments and inject them into the prompt as "musical direction."
- **Consequences:**
  - More specific and contextually relevant prompts without manual descriptor writing.
  - Knowledge base can grow independently of the prompt engine logic.
  - Upgrade path to pgvector + external embeddings (e.g., OpenAI text-embedding-3-small) when scale requires it.

---

## ADR-018 – Track Evaluation and Quality Metrics Framework

- **Status:** Accepted
- **Context:**
  - Without quality feedback, there's no way to know which mood/style combinations or providers produce better results.
  - User satisfaction data is essential for prompt optimization and provider selection.
- **Decision:**
  - Add a `track_ratings` table with four rating dimensions: satisfaction, mood accuracy, style accuracy, and audio quality (each 1–5).
  - Weighted overall score: satisfaction (30%) + mood accuracy (25%) + style accuracy (25%) + audio quality (20%).
  - Aggregate at three levels: per-track, per-provider, and mood×style matrix.
  - One rating per user per track (upsert on conflict).
- **Consequences:**
  - Data-driven prompt optimization: low-scoring mood/style combinations can be improved.
  - Provider comparison: objectively compare MusicGen vs OpenAI based on user ratings.
  - The mood×style quality matrix reveals blind spots in the prompt engine.

---

## ADR-019 – Prompt Benchmarking Framework

- **Status:** Accepted
- **Context:**
  - Multiple prompt strategies exist (simple template, descriptor-based, narrative, technical-musical).
  - No systematic way to compare them before deploying to production.
- **Decision:**
  - Create a benchmarking script (`scripts/benchmark-prompts.ts`) that evaluates 4 strategies across 6 diverse test cases.
  - Score on 5 criteria: specificity (25%), mood accuracy (25%), style fidelity (20%), distinctiveness (20%), clarity (10%).
  - Output aggregate rankings with recommendations.
  - Support both heuristic (automated) and manual (with live generation) evaluation modes.
- **Consequences:**
  - Prompt strategy changes can be validated before deployment.
  - Creates a reproducible baseline for future A/B testing.
  - Documents the rationale for choosing the descriptor-based strategy.

---

## ADR-020 – Music Therapy with Binaural Beat Entrainment

- **Status:** Accepted
- **Context:**
  - Binaural beats and Solfeggio frequencies have research backing for relaxation, focus, and pain management.
  - Existing tools are either basic tone generators or expensive standalone apps.
  - The platform already has an ffmpeg pipeline capable of audio mixing.
- **Decision:**
  - Add a therapy generation mode (`POST /api/generate/therapy`) with a dedicated service layer under `src/services/therapy/`.
  - Map 20 therapeutic goals to brainwave frequency bands (delta/theta/alpha/beta/gamma) and Solfeggio frequencies (174–963 Hz).
  - Generate binaural beats via ffmpeg stereo sine tone pairs (carrier 200 Hz + carrier+target Hz) layered under AI-generated music.
  - Implement 3-phase session entrainment: induction (15%) → deepening (70%) → emergence (15%) with piecewise-linear frequency sweeps.
  - Map each goal to a research-based smart tempo (55–100 BPM) instead of a fixed value.
  - Store frequency metadata (`therapy_frequency` JSONB column) with each therapy track.
- **Consequences:**
  - Significant feature differentiation from basic ambient generators.
  - Requires headphones for the binaural beat effect — documented in the UI.
  - The frequency mapping and session phasing logic are pure functions, easily testable.
  - The therapy pipeline reuses the same storage, auth, and billing infrastructure as ambient generation.

---

## ADR-021 – Cultural Healing Modes via Prompt Injection

- **Status:** Accepted
- **Context:**
  - Sound therapy traditions (Chinese Five-Element, Indian Raga, Ottoman Maqam) use specific musical systems for healing.
  - Implementing these as dedicated audio synthesis engines would be prohibitively complex.
- **Decision:**
  - Implement three cultural healing modes as prompt-level musical guidance injected into the AI generation request.
  - Each mode provides general `musicalGuidance` and goal-specific `refinement` text.
  - Cultural mode is an optional step in the therapy questionnaire (between genre and settings).
- **Consequences:**
  - Cultural authenticity depends on the AI model's training data — acceptable for a portfolio piece.
  - No additional audio processing infrastructure needed.
  - Easily extensible — adding a new cultural tradition means adding prompt entries only.

---

## ADR-022 – Professional Audio Fades on All Tracks

- **Status:** Accepted
- **Context:**
  - AI-generated music often has abrupt starts and endings.
  - Professional audio production requires smooth transitions.
- **Decision:**
  - Apply a 3-second fade-in and 4-second fade-out to all generated tracks (both ambient and therapy) via ffmpeg `afade` filters.
  - Fades are applied in the ffmpeg pipeline before upload, not as a post-processing step.
- **Consequences:**
  - All tracks sound polished regardless of AI model output quality.
  - Minimal performance impact (single ffmpeg filter pass).

---

## ADR-023 – Removed Hard Limits on Track Parameters

- **Status:** Accepted
- **Context:**
  - Original constraints (`tempo: 50–90`, `length: 30–120`, `durationSeconds: 30–300`) were arbitrary MVP limits.
  - Users reported wanting longer tracks and wider tempo ranges.
- **Decision:**
  - Remove maximum constraints from backend schemas and database CHECK constraints.
  - Keep minimum constraints (`>= 1`) for safety.
  - Remove max attribute constraints from frontend inputs.
- **Consequences:**
  - Users can generate tracks of any length (subject to provider and storage limits).
  - Storage costs scale with track length — acceptable given Supabase Storage pricing.
  - OpenAPI spec updated to reflect the relaxed constraints.

---

## ADR-024 – Unified Post-Generation UX (Toast + Library Only)

- **Status:** Accepted
- **Context:**
  - Ambient tracks used toast notification + library after generation.
  - Therapy tracks used a dedicated inline result view with audio player, download buttons, and frequency metadata.
  - This inconsistency confused users — therapy tracks appeared in two places (inline result + library).
- **Decision:**
  - Unify both ambient and therapy to the same post-generation flow: success toast → return to settings form → track appears in library.
  - Remove the therapy result step entirely (including the `'result'` state, `audioRef`, `frequencyBandInfo`, and related imports).
  - Display therapy-specific metadata (wave band, binaural Hz, Solfeggio Hz, label) as badge chips on the library track card instead.
- **Consequences:**
  - Consistent UX across both generation modes.
  - Therapy frequency info is still visible — just in the library rather than a dedicated result view.
  - Simpler component state in `therapy-panel.tsx` (fewer steps, less state).

---

## ADR-025 – Therapy Frequency Metadata as JSONB Column

- **Status:** Accepted
- **Context:**
  - Therapy tracks have frequency parameters (brainwave band, binaural Hz, Solfeggio Hz, label) that should be visible in the library.
  - Adding separate typed columns for each field would be over-normalized for optional data.
- **Decision:**
  - Add a `therapy_frequency` JSONB column to the `tracks` table (nullable, null for standard tracks).
  - Store `{ band, hz, solfeggioHz, label }` at generation time.
  - Return the data in the API response and display as badge chips in the library UI.
  - Update the Fastify response schema to include `therapyFrequency` to prevent serialization stripping.
- **Consequences:**
  - Flexible schema — new frequency fields can be added without migrations.
  - Slightly less queryable than typed columns (JSONB vs. native columns) — acceptable since this data is read-only display.
