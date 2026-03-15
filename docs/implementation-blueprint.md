# Implementation Blueprint – Sonic Therapy Platform

This document translates the soft-design and ADRs into a **practical implementation roadmap**.

Current phase: **v1 product slice – personalized music therapy, ambient generation, Supabase-backed, multi-model fallback, sync generation, dashboard + API**

Built by **Deciwa**.

---

## 1) Fastify Folder Structure (Node.js + TypeScript Project)

Proposed repository structure:

```text
ambient-bgm-api/
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts                 # Entrypoint: create Fastify instance and register routes
    app.ts                   # buildApp(): build and configure Fastify (for testing and runtime)

    config/
      env.ts                 # Read and validate env vars (Supabase, Stripe, provider, ...)

    infra/
      supabaseClient.ts      # Create Supabase client (Postgrest + Storage)
      stripeClient.ts        # Create Stripe client
      ffmpeg.ts              # Wrapper for running ffmpeg (child_process or fluent-ffmpeg)

    routes/
      generate.route.ts      # POST /api/generate
      therapy.route.ts       # POST /api/generate/therapy
      keys.route.ts          # POST /api/keys
      me.route.ts            # GET /api/me
      account.route.ts       # GET/POST/DELETE /api/account/*
      stripeWebhook.route.ts # POST /webhooks/stripe
      health.route.ts        # GET /healthz
      tracks.route.ts        # (Future) GET /api/tracks/:id

    schemas/                 # JSON Schemas for Fastify (body/params/response)
      generate.schema.ts
      therapy.schema.ts
      keys.schema.ts
      me.schema.ts
      account.schema.ts
      stripeWebhook.schema.ts
      error.schema.ts

    services/
      auth/
        apiKeyAuthService.ts     # Validate API key and return user
        apiKeyManagementService.ts # Create, list, delete API keys
        apiKeyRateLimitService.ts  # Per-key rate limiting
        userSessionAuthService.ts# Validate Supabase session bearer tokens
      billing/
        planService.ts           # Plan logic and limits
        stripeWebhookService.ts  # Process Stripe events
        stripeBillingService.ts  # Create checkout and portal sessions
      usage/
        usageService.ts          # UsageDaily + quota check
      tracks/
        generateTrackService.ts  # Full track generation orchestration
        trackMetadataService.ts  # Track persistence and metadata mapping
        listTracksService.ts     # Dashboard track history listing
      therapy/
        frequencyMappingService.ts  # Goal → brainwave band + Solfeggio + smart tempo + session phases
        therapyPromptEngine.ts      # Therapy-aware prompt building with cultural healing modes
        binauralMixService.ts       # Binaural beat + Solfeggio mixing via ffmpeg
        generateTherapyTrackService.ts  # Full therapy track orchestration
      prompt/
        promptEngine.ts          # Build prompt from API inputs
        promptRetrieval.ts       # RAG retrieval with cosine similarity
      storage/
        storageService.ts        # Storage abstraction interface
        supabaseStorageService.ts # Supabase Storage implementation

    providers/
      audio/
        audioProvider.ts              # AudioProvider interface
        defaultAudioProvider.ts       # OpenAI audio provider
        replicateMusicGenProvider.ts  # Meta MusicGen via Replicate (primary)
        multiProviderWithFallback.ts  # Sequential fallback orchestrator

    types/
      domain.ts                  # Domain-level types: User, Plan, TrackMetadata, ...
      errors.ts                  # Error codes and error classes

  tests/
    unit/
    integration/

  web/
    app/
    components/
      dashboard-app.tsx        # Main dashboard with ambient generation + library
      therapy-panel.tsx         # Multi-step therapy questionnaire
    lib/
      api.ts                   # API client (generateTrack, generateTherapyTrack, etc.)
      types.ts                 # Frontend types (AccountTrackItem, TherapyFrequencyTarget, etc.)
      download.ts              # Fetch-and-save download helper for cross-origin Supabase URLs
      supabase-browser.ts      # Supabase browser client
```

---

## 2) Complete Service Layer Design

### 2.1 Auth & API Key Service

- **File:** `src/services/auth/apiKeyAuthService.ts`
- **Responsibilities:**
  - Read `Authorization: Bearer <API_KEY>`.
  - Look up `ApiKey` in the DB by `key_hash`.
  - Return `user` + `plan` + basic info.
  - Manage key status (active/disabled/revoked).
- **Proposed interface (conceptual):**

```ts
interface ApiKeyAuthService {
  authenticate(apiKey: string): Promise<{ user: User; apiKey: ApiKey }>;
}
```

### 2.2 Plan & Billing Service

- **File:** `src/services/billing/planService.ts`
- **Responsibilities:**
  - Map `user.plan` → daily quota, features (MP3/WAV, watermark, commercial_license).
  - Logic for what permissions Free/Basic/Pro/Ultra plans grant.
- **File:** `src/services/billing/stripeWebhookService.ts`
- **Responsibilities:**
  - Validate Stripe signature.
  - Store event in `stripe_webhook_events`.
  - Update `user.plan`, `stripe_customer_id`, subscription state.

### 2.3 Usage & Quota Service

- **File:** `src/services/usage/usageService.ts`
- **Responsibilities:**
  - Before each generate:
    - Begin transaction.
    - Find/create `UsageDaily (user_id, date)` record.
    - Compare `requests_count` against `plan_limit`.
    - Increment counter and commit.
  - Throw domain-level `QuotaExceededError` if the limit is exceeded.
- **Interface:**

```ts
interface UsageService {
  checkAndConsumeDaily(user: User, plan: Plan): Promise<void>;
}
```

### 2.4 Prompt Engine Service

- **File:** `src/services/prompt/promptEngine.ts`
- **Responsibilities:**
  - Validate mood/style/tempo/length/intensity values at the domain level (or rely on schema).
  - Apply default `intensity = "medium"` if not provided.
  - Use **mood-specific descriptors** (e.g., romantic → "warm harmonies, gentle swells, intimate feel") and **style-specific descriptors** (e.g., jazz → "gentle swing rhythms, soft brushed drums, walking bass").
  - Include **intensity-aware dynamics**: soft (minimal layers, gentle), medium (balanced), high (full layers, driving rhythm).
  - Build the final prompt by dynamically combining mood descriptors, style descriptors, tempo, length, and intensity.
- **Interface:**

```ts
interface PromptEngine {
  buildPrompt(input: GenerateRequest): PromptPayload;
}
```

- **Key design:** Adding a new mood or style only requires adding a descriptor entry to the lookup maps — no engine logic changes needed.

### 2.5 Audio Generation / Track Service

- **File:** `src/services/tracks/generateTrackService.ts`
- **Responsibilities (orchestration):**
  1. Auth → user + plan.
  2. Quota → `usageService.checkAndConsumeDaily`.
  3. Prompt → `promptEngine.buildPrompt`.
  4. Audio Provider → `audioProvider.generateTrack(prompt, options)`.
  5. ffmpeg pipeline → normalize + watermark (if Free) + encoding MP3/WAV.
  6. Storage → upload files to Supabase Storage.
  7. DB → write `Track` row with full metadata.
  8. Build response payload including `download_url` and metadata.
- **Interface:**

```ts
interface GenerateTrackService {
  generate(request: GenerateRequest, apiKey: string): Promise<GenerateResponse>;
}
```

### 2.6 Storage Service

- **File:** `src/services/storage/storageService.ts`
- **Responsibilities:**
  - Abstraction over Supabase Storage.
  - Upload final track (MP3 and optionally WAV).
  - Generate Signed URLs with TTL.
- **Interface:**

```ts
interface StorageService {
  uploadTrack(params: {
    userId: string;
    trackId: string;
    localFilePath: string;
    format: 'mp3' | 'wav';
  }): Promise<{ storagePath: string }>;

  getDownloadUrl(params: { storagePath: string; expiresInSeconds: number }): Promise<string>;
}
```

### 2.7 Stripe Webhook Service

- **File:** `src/services/billing/stripeWebhookService.ts`
- **Responsibilities:**
  - Process events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`.
  - Log all events in `stripe_webhook_events`.
  - Update plan and subscription state.

---

## 3) Supabase SQL Schema Design (migration-ready)

Note: These are proposed table names; in Supabase they can be created in the `public` schema. If Supabase Auth is used, `user_id` can reference `auth.users`.

### 3.1 Enum Types

```sql
CREATE TYPE plan_type AS ENUM ('free', 'basic', 'pro', 'ultra');

CREATE TYPE api_key_status AS ENUM ('active', 'disabled', 'revoked');

CREATE TYPE intensity_level AS ENUM ('soft', 'medium', 'high');
```

### 3.2 Table: app_users

```sql
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  plan plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

> If Supabase Auth (`auth.users`) is used, `app_users.id` can be synced with `auth.users.id` or `auth.users` can be used directly. This document shows the simplest approach (standalone table).

### 3.3 Table: api_keys

```sql
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text,
  status api_key_status NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys (user_id);
```

### 3.4 Table: tracks

```sql
CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  wav_storage_path text,
  format text NOT NULL CHECK (format IN ('mp3', 'wav')),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),

  mood text NOT NULL,
  style text NOT NULL,
  tempo integer NOT NULL,
  length integer NOT NULL,
  intensity intensity_level NOT NULL DEFAULT 'medium',

  provider text NOT NULL,
  provider_version text,
  plan plan_type NOT NULL,
  watermarked boolean NOT NULL DEFAULT false,
  commercial_license boolean NOT NULL DEFAULT false,

  track_type text NOT NULL DEFAULT 'standard' CHECK (track_type IN ('standard', 'therapy')),
  therapy_frequency jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tracks_user_created_idx ON public.tracks (user_id, created_at DESC);
```

### 3.5 Table: usage_daily

```sql
CREATE TABLE public.usage_daily (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  date date NOT NULL,
  requests_count integer NOT NULL DEFAULT 0,
  CONSTRAINT usage_daily_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX usage_daily_user_date_idx ON public.usage_daily (user_id, date);
```

### 3.6 Table: stripe_webhook_events

```sql
CREATE TABLE public.stripe_webhook_events (
  id bigserial PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 4) Complete Endpoint Skeleton (Fastify)

Below we define the route skeletons and their connections to services. (Final code is implemented in `src/routes/*.route.ts`.)

### 4.1 POST /api/generate

- **File:** `src/routes/generate.route.ts`
- **High-level handler flow:**

```ts
fastify.post(
  '/api/generate',
  {
    schema: GenerateSchema,
  },
  async (request, reply) => {
    const apiKey = extractApiKey(request.headers);
    const response = await generateTrackService.generate(request.body, apiKey);
    reply.send(response);
  },
);
```

- **Dependencies:** `ApiKeyAuthService`, `UsageService`, `PromptEngine`, `AudioProvider`, `StorageService`.

### 4.2 POST /api/keys

- **File:** `src/routes/keys.route.ts`
- **Note:** Behind user-auth (not API key). In v1 this route may only be used internally/CLI.

```ts
fastify.post(
  '/api/keys',
  {
    preHandler: requireUserAuth, // session/JWT
    schema: CreateApiKeySchema,
  },
  async (request, reply) => {
    const apiKey = await apiKeyService.createForUser(request.user.id, request.body.label);
    reply.send(apiKey);
  },
);
```

### 4.3 GET /api/me

- **File:** `src/routes/me.route.ts`
- **Auth:** API key

```ts
fastify.get(
  '/api/me',
  {
    schema: MeSchema,
  },
  async (request, reply) => {
    const apiKey = extractApiKey(request.headers);
    const { user } = await apiKeyAuthService.authenticate(apiKey);
    const usage = await usageService.getTodayUsage(user.id);
    const planInfo = planService.describePlan(user.plan, usage.requestsCount);
    reply.send({ user, ...planInfo });
  },
);
```

### 4.4 POST /webhooks/stripe

- **File:** `src/routes/stripeWebhook.route.ts`

```ts
fastify.post(
  '/webhooks/stripe',
  {
    config: { rawBody: true },
  },
  async (request, reply) => {
    await stripeWebhookService.handleEvent(request.rawBody, request.headers['stripe-signature']);
    reply.code(200).send({ received: true });
  },
);
```

### 4.5 GET /healthz

- **File:** `src/routes/health.route.ts`
- **Purpose:** Simple health check (DB + provider readiness).

```ts
fastify.get('/healthz', async () => ({ status: 'ok' }));
```

### 4.6 (Future) GET /api/tracks/:id

- **File:** `src/routes/tracks.route.ts`
- **Purpose:** Return track metadata and a fresh download link.

---

## 5) Provider Adapter Structure

### 5.1 Generic Provider Interface

- **File:** `src/providers/audio/audioProvider.ts`

```ts
export interface AudioProvider {
  generateTrack(params: { prompt: string; tempo: number; lengthSeconds: number }): Promise<{
    /** Temporary file path of the provider output (e.g., WAV) */
    tempFilePath: string;
    format: 'wav' | 'mp3';
  }>;
}
```

### 5.2 v1 Implementation – defaultAudioProvider

- **File:** `src/providers/audio/defaultAudioProvider.ts`
- **Note:**
  - The active provider (`openai` or `suno`) is specified via env vars.
  - This file implements only one of them in v1.

```ts
export class DefaultAudioProvider implements AudioProvider {
  constructor(private readonly config: ProviderConfig) {}

  async generateTrack(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    // call OpenAI/Suno API based on config
  }
}
```

In v2, multiple classes (`OpenAIAudioProvider`, `SunoAudioProvider`) and a factory for provider selection can be added.

---

## 6) Storage Layer Abstraction

### 6.1 Interface

- **File:** `src/services/storage/storageService.ts`

```ts
export interface StorageService {
  uploadTrack(params: {
    userId: string;
    trackId: string;
    localFilePath: string;
    format: 'mp3' | 'wav';
  }): Promise<{ storagePath: string }>;

  getDownloadUrl(params: { storagePath: string; expiresInSeconds: number }): Promise<string>;
}
```

### 6.2 SupabaseStorageService (v1)

- **File:** `src/services/storage/supabaseStorageService.ts`
- **Responsibilities:**
  - Map `userId` + `trackId` → `storage_path`, e.g.:
    - `tracks/{userId}/{trackId}.mp3`
  - Use the Supabase JS client for `upload` and `createSignedUrl`.

In the future, if migrating to S3, only the implementation changes — not the interface.

---

## 7) ffmpeg Pipeline Blueprint

### 7.1 Purpose

The ffmpeg pipeline is responsible for:

- Taking the raw provider output (e.g., WAV).
- Normalizing audio loudness.
- Applying fade-in (3s) and fade-out (4s).
- Adding a watermark (if Free plan).
- For therapy tracks: mixing binaural beats and optional Solfeggio tones with 3-phase frequency ramping.
- Final encoding to MP3 192kbps (and optionally WAV).

### 7.2 Processing Steps

1. **Receive raw file**
   - `tempInputPath` from `AudioProvider.generateTrack`.
2. **Convert to base format** (if needed):
   - Example: WAV, 44.1kHz, 16-bit stereo.
3. **Normalize Loudness**
   - Use the `loudnorm` filter in ffmpeg for consistent loudness levels.
4. **Add Watermark (Free plan only)**
   - watermarkFile: a static short WAV file from Supabase Storage (or a local asset).
   - Mix the watermark into only the last 3–5 seconds of the track using `amix` or `adelay + amix` filters.
   - Watermark gain is read from config to keep it non-intrusive.
5. **Encode to MP3 (and WAV for Pro/Ultra)**
   - MP3: minimum bitrate of 192kbps.
   - If the plan allows it, a WAV output is also saved.
6. **Output**
   - Paths `tempMp3Path` (and optionally `tempWavPath`).
   - These paths are later sent to Supabase via `StorageService.uploadTrack`.
7. **Cleanup**
   - Delete temporary files after successful upload (in the `finally` block).

### 7.3 ffmpeg Wrapper Module

- **File:** `src/infra/ffmpeg.ts`
- **Options:**
  - Use `child_process.spawn` to run ffmpeg commands.
  - Or use a library such as `fluent-ffmpeg`.
- **Pattern:**
  - Each operation is an async function that takes input/output file paths and returns a Promise.
  - Appropriate logging for processing duration and errors.

---

## 8) Dashboard Component Architecture

### 8.1 Main Component

- **File:** `web/components/dashboard-app.tsx`
- **Responsibilities:**
  - Session management (sign-in/sign-up via Supabase Auth)
  - API key lifecycle (create, select with "in-use" indicator, delete)
  - Tab system: Ambient Music | Therapy
  - Ambient music generation with form inputs (mood, style, tempo, length, intensity)
  - Full-panel progress view with percentage and ETA (unified for both modes)
  - Unified post-generation: success toast → track appears in library
  - Library with search, type/mood/style dropdown filters, and pagination
  - Therapy frequency metadata chips on therapy track cards (wave band, binaural Hz, Solfeggio Hz)
  - Exclusive audio playback (one track at a time)
  - Stripe billing integration (checkout and portal)

### 8.2 Therapy Panel

- **File:** `web/components/therapy-panel.tsx`
- **Responsibilities:**
  - Multi-step questionnaire: goal → body area/emotion → genre → cultural healing mode → settings
  - 20 therapeutic goals organized by category (Physical, Emotional, Mental, Cognitive, Peak Performance)
  - Cultural healing mode selection (Chinese Five-Element, Indian Raga, Ottoman Maqam)
  - Generation with full-panel progress view
  - Toast notification on success, return to settings step

### 8.3 Theme and Styling

- **File:** `web/app/globals.css`
- Custom DaisyUI theme (`ambient`) with:
  - Dark navy background (`#0f1b2d`)
  - Gold primary color (`#d4af37`)
  - Gold-tinted borders (`#3a3222`, `0.5px` width)
  - Gold focus rings on all inputs/selects
  - "Designed & built by Deciwa" footer

---

## Summary

- This blueprint is directly translatable into:
  - Folder structure in `src/`.
  - Supabase migration files (SQL).
  - Initial Fastify route + service skeletons.
  - Dashboard components in `web/`.
- Current status:
  - All backend services, routes, and migrations are implemented (0001–0007).
  - Dashboard is fully functional with polished UX and unified generation experience.
  - Prompt engine uses intelligent mood/style descriptors.
  - Therapy mode with binaural beats, Solfeggio tones, session phasing, smart tempo, and cultural healing modes.
  - Therapy frequency metadata stored and displayed in library.
  - Professional fade-in/fade-out on all tracks.
  - No hard limits on track parameters.
  - Full API key lifecycle (create, select, delete) is supported.
