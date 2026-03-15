## Sonic Therapy Platform – Soft Design

### 1. Product Vision & Role

A **personalized music therapy platform** that generates AI-powered therapeutic audio sessions — combining binaural beat entrainment, Solfeggio frequencies, cultural healing traditions, and AI music generation into a single product surface. Built by **Deciwa**.

Secondary surface: ambient background music generation for content creators using the same AI pipeline.

- **Target Audience**
  - Individuals seeking personalized music therapy (pain, sleep, focus, emotional, cognitive)
  - Wellness practitioners and therapists
  - Content creators needing ambient background music
  - Developers integrating therapeutic audio into their products

- **Outputs**
  - `MP3` audio file with a minimum bitrate of `192kbps` (all plans except watermarked)
  - `WAV` audio file (Pro plan and above)
  - `metadata JSON` including input parameters and generation details (duration, format, provider, etc.)
  - (Optional future) Short preview or watermarked version

- **Track Duration Range**
  - No hard maximum — limited only by provider and storage capacity
  - Minimum: 1 second

### 2. API Surface & Parameters

#### 2.1 Main Generate Inputs

Base body for `POST /api/generate`:

```json
{
  "mood": "calm",
  "style": "ambient",
  "tempo": 60,
  "length": 45,
  "intensity": "soft" // Optional, defaults to "medium" if not provided
}
```

- **mood**: One of the allowed values
  - `calm | focus | energetic | dark | dreamy | romantic | melancholy | uplifting`
- **style**: One of the allowed values
  - `ambient | lofi | cinematic | electronic | classical | nature | jazz | chillhop`
- **tempo**: Integer, minimum `1` (no upper limit)
- **length**: Seconds, minimum `1` (no upper limit)
- **intensity** (suggested): `soft | medium | high`
  - Affects dynamics, layer volume, and percussion presence.
  - If `intensity` is not provided, it defaults to `"medium"`.

The following parameters can be added in future versions (marked as **Future** in this document):

- **seed**: For reproducibility
- **loopable**: `boolean` to optimize start/end for seamless looping
- **variation_of_track_id**: Generate an alternative version of a previous track

#### 2.2 Generate API Output

```json
{
  "id": "track_23423",
  "status": "completed",
  "download_url": "https://.../track_23423.mp3",
  "format": "mp3",
  "expires_in": 3600,
  "metadata": {
    "tempo": 60,
    "mood": "calm",
    "duration": 45,
    "style": "ambient",
    "intensity": "soft",
    "provider": "openai",
    "plan": "free",
    "watermarked": true,
    "commercial_license": false
  }
}
```

If WAV output is enabled, `download_url_wav` and `format_wav` fields are also included (Pro and Ultra plans only).

- **Notes:**
  - `status`: In v1, the value is always `"completed"` (synchronous generation), but in v2 (async jobs) values like `pending` and `processing` will also be used.
  - `expires_in`: Download link validity in seconds (e.g., `3600` = one hour). After this time, the Signed URL becomes invalid and the user must generate a new track or (in the future) use a status/regen endpoint.
  - `provider`: In v1, only one provider (e.g., `openai` or `suno`) is used. This field is designed now to support multi-provider in v2.
  - `watermarked`: `true` for the Free plan and `false` for paid plans, so the client can easily determine whether the output is suitable for commercial use.
  - `commercial_license`: `true` for the Ultra plan (and `false` for all other plans).

### 3. Non-Functional Requirements (NFR)

- **Target Latency**
  - For 30–60 second tracks: under 15–30 seconds end-to-end
  - This latency includes third-party provider response time, ffmpeg processing, and upload to Supabase Storage.
- **Scalability**
  - Horizontal scaling of API and workers
- **Reliability**
  - Minimum 99% uptime for the public API
- **Observability**
  - Structured logging (JSON)
  - Metrics: request count, response time, error rate, average cost per track
- **Security**
  - HTTPS only
  - API Key per user, stored as hash only
  - Signed URLs for accessing files in Supabase Storage
- **Cost-control**
  - Daily quota based on DB (Supabase Postgres)
  - Redis is not used in the current version; it can be added later for rate limiting if needed

### 4. High-Level Architecture

Core stack:

- **Backend:** Node.js 20 + Fastify + TypeScript
- **Platform (DB/Auth/Storage):** Supabase (PostgreSQL + Auth + Storage Buckets)
- **Billing:** Stripe
- **Quota & Usage Tracking:** Supabase DB (no Redis in the current version)
- **Audio Provider:** A single provider (OpenAI Audio or Suno) via a simple adapter

High-level flow:

1. Client → sends `POST /api/generate` with `Bearer API_KEY`
2. Fastify:
   - Validates API key
   - Extracts user and plan
   - Checks quota and rate limiting
3. Prompt Engine → builds a text-based prompt
4. Audio Generation Engine:
   - Selects the appropriate provider (OpenAI / Suno / ...)
   - Calls the external API
5. After receiving the raw file:
   - Post-processing (normalize, watermark, format convert)
   - Upload to Supabase Storage bucket
   - Save metadata in DB
6. Returns `download_url` (Signed URL with TTL) + `metadata` to the user

Architecture pattern:

- **API Layer (Fastify)**
- **Domain Services:**
  - Auth & API Keys Service
  - Billing & Plan Service
  - Generate Track Service (Prompt + Provider + Storage)
  - Usage & Quota Service
- **Infrastructure:**
  - Supabase (Auth + Postgres + Storage), Stripe, Audio Provider

### 5. Components

- **API Gateway / HTTP Server (Fastify)**
  - Manages routing, validation, and standardized JSON error handling

- **Auth & API Key Management**
  - Stores key hash in Supabase Postgres
  - Supports multi-key per user
  - Key status: `active | disabled | revoked`

- **Billing & Subscription (Stripe)**
  - Model:
    - **Free**: No card required, direct API link
    - **Basic / Pro / Ultra**: Via Checkout Session and Webhook
  - Plan and quota sync after webhook

- **Usage Tracking & Rate Limiting**
  - Uses the `UsageDaily` table in Supabase DB for daily quota
  - (Optional future) Add short-term rate limiting if higher scale is required
  - On limit exceeded → HTTP 429 or 402

- **Audio Generation Engine**
  - `PromptEngine` module
  - `AudioProviderAdapter` module (in v1 only one provider: OpenAI Audio or Suno)
  - Post-processing module (ffmpeg wrapper)

- **Storage Layer**
  - Builds storage paths based on `user_id` and `track_id`
  - Generates Signed URLs with secure TTL
  - (Future) If migration from Supabase Storage to S3 or another cloud storage is needed, keeping `storage_path` abstract allows this transition without changing the API.

- **Background Jobs (Future)**
  - Job queue system for longer tracks or high traffic (outside current MVP scope)
  - Async generation + callback / polling endpoint

### 6. Prompt Engine Design

#### 6.1 Intelligent Prompt Engine

The prompt engine uses **mood-specific descriptors** and **style-specific descriptors** to produce distinct outputs for each combination. A static template is no longer used.

Each mood maps to a set of musical descriptors:

- `calm` → "gentle pads, slow-moving harmonies, peaceful atmosphere"
- `romantic` → "warm harmonies, gentle swells, intimate feel"
- `dark` → "deep bass tones, brooding atmosphere, tension"
- etc.

Each style maps to instrumentation and technique descriptors:

- `ambient` → "ethereal pads, reverb-drenched textures, slow evolution"
- `jazz` → "gentle swing rhythms, soft brushed drums, walking bass"
- `lofi` → "vinyl crackle, warm keys, mellow tape saturation"
- etc.

Intensity affects dynamics:

- `soft` → minimal layers, gentle dynamics, sparse arrangement
- `medium` → balanced layers, moderate dynamics
- `high` → full layers, driving rhythm, rich harmonic density

The engine dynamically combines these into a unique prompt:

```text
Generate a {LENGTH}-second {MOOD} {STYLE} background music track at {TEMPO} BPM.
{MOOD_DESCRIPTORS}
{STYLE_DESCRIPTORS}
{INTENSITY_DYNAMICS}
No vocals, no sudden changes. Smooth, atmospheric, and loop-friendly.
```

- **Parameters**
  - `MOOD`: `calm | focus | energetic | dark | dreamy | romantic | melancholy | uplifting`
  - `STYLE`: `ambient | lofi | cinematic | electronic | classical | nature | jazz | chillhop`
  - `TEMPO`: `50–90` BPM
  - `LENGTH`: `30–120` seconds
  - `INTENSITY`: `soft | medium | high`
  - If the user does not provide a value for `intensity`, the `PromptEngine` substitutes the default `"medium"`.

#### 6.2 Responsibilities

- Maintain mood and style descriptor lookup maps
- Dynamically combine descriptors based on input parameters
- Support defining different templates for different providers (e.g., Suno vs OpenAI)
- Adding new moods or styles requires only adding descriptor entries, not changing the engine logic
- Log the template version for reproducibility

### 7. Endpoint Design

#### 7.1 POST /api/generate – Music Generation

- **Auth:** `Authorization: Bearer API_KEY`
- **Body:**
  - `mood`, `style`, `tempo`, `length`, `intensity` (optional)
- **Validation:**
  - Check ranges and enums
  - If a parameter is out of range → HTTP 400 with a specific error code

- **Business Logic:**
  - Resolve user from API key
  - Check plan and daily quota
  - Check quota via the `UsageDaily` table in DB (no Redis in v1)
  - Build prompt via `PromptEngine`
  - Call the selected provider
  - Save file to Supabase Storage bucket + metadata in DB
  - Add watermark for the Free plan

- **Response 200:**
  - As shown in section 2.2

- **Suggested Error Codes:**
  - `400` – invalid_parameter / validation_error
  - `401` – invalid_api_key / missing_authorization_header / invalid_authorization_header
  - `402` – payment_required / plan_inactive
  - `429` – quota_exceeded
  - `500` – provider_error / storage_error / db_error / internal_error / unknown_error

- **Standardized Error Structure (for all endpoints):**

  All endpoints return errors in the following structure:

  ```json
  {
    "error": {
      "code": "quota_exceeded",
      "message": "Daily quota exceeded for this plan",
      "status": 429
    }
  }
  ```

  - `code`: Machine-readable identifier, stable for each error type (e.g., `invalid_parameter`, `invalid_api_key`, `quota_exceeded`).
  - `message`: Human-readable text (can be displayed directly to the end user).
  - `status`: Mirrors the HTTP status for API consumer convenience.

#### 7.2 POST /api/keys – Generate New API Key

This endpoint is used from the dashboard and CLI tools.

- **Auth (v1):** `Authorization: Bearer API_KEY` (can migrate to session/JWT-based user-auth in the future)
- **Body:**
  - `label` (optional – a custom name for the key)

- **Logic:**
  - Generate a secret random key (e.g., `amb_<64-hex>`)
  - Compute `key_hash` with SHA-256 and store in the `api_keys` table (not the raw key)
  - Keep the raw key in memory only for building the response (never stored in DB)
  - Optionally limit the number of active keys per user (e.g., max 5) in the future

- **Response (v1):**
  - `id`: Key identifier in DB
  - `apiKey`: The full secret key value (shown only once)
  - `label`: Optional key label (or null)
  - `createdAt`: Key creation timestamp (ISO 8601)

#### 7.3 GET /api/me – View Usage

- **Auth:** `Authorization: Bearer API_KEY`
- **Response includes:**
  - `userId`: User identifier
  - `plan`: Current plan (`free | basic | pro | ultra`)
  - `dailyQuota`: Maximum daily requests based on plan
  - `usedToday`: Number of requests used today
  - `remainingToday`: Remaining quota for today

Example response:

```json
{
  "userId": "usr_123",
  "plan": "pro",
  "dailyQuota": 20,
  "usedToday": 3,
  "remainingToday": 17
}
```

#### 7.4 Stripe Webhook – Payment Confirmation

- **Endpoint:** `POST /webhooks/stripe`
- **Security:**
  - Uses `Stripe-Signature` header and secret
  - Rejects requests with invalid signatures

- **Key Events:**
  - `checkout.session.completed` → Activate user's plan
  - `customer.subscription.updated` → Update plan, period end date, status
  - `invoice.payment_failed` → Mark plan as grace-period

- **Behavior:**
  - All events are logged in the `stripe_webhook_events` table (`stripe_event_id`, `type`, `payload`, `processed_at`).
  - For idempotency, a `UNIQUE` constraint exists on `stripe_event_id` and each event is processed only once.
  - Changes to user & plan are applied atomically at the `app_users` record level; if business logic fails, `processed_at` is not set to allow retry.

- **Event Handling Table (v1):**

  | Event Type                      | Plan / User Info Source                             | Primary Behavior                                                                                    |
  | ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
  | `checkout.session.completed`    | `session.metadata.plan`, `session.metadata.user_id` | If `plan` and `user_id` are valid: set `app_users.plan = plan` and set/update `stripe_customer_id`. |
  |                                 | `session.customer` / `session.customer_details`     | If user does not exist, create a new `app_users` record with the same `id` and `email`.             |
  | `customer.subscription.updated` | `subscription.metadata.plan`                        | If `plan` and `stripe_customer_id` are valid: find the corresponding user and update `plan`.        |
  |                                 | `subscription.customer`                             | If no user exists for that customer, the event is only logged.                                      |
  | `invoice.payment_failed`        | `invoice.customer`                                  | The user whose `stripe_customer_id` matches the customer is downgraded to `free`.                   |

#### 7.5 POST /api/generate/therapy — Therapy Music Generation

- **File:** `src/routes/therapy.route.ts`
- **Auth:** `Authorization: Bearer API_KEY`
- **Body:**
  - `goal` (one of 20 therapeutic goals), `genre`, `durationSeconds`, `intensity`
  - Optional: `bodyArea` (for physical goals), `emotion` (for emotion_relief goal), `culturalMode`
- **Business Logic:**
  - Resolve frequency target (brainwave band, Hz, Solfeggio Hz) via `frequencyMappingService`
  - Compute smart tempo and session phases (induction/deepening/emergence)
  - Build therapy-aware prompt via `therapyPromptEngine` (with optional cultural healing mode guidance)
  - Generate music via provider (same multi-provider fallback)
  - Mix binaural beats and optional Solfeggio tones via `binauralMixService`
  - Apply fade-in/fade-out, normalization, watermark (if Free)
  - Save with `track_type = 'therapy'` and `therapy_frequency` JSONB metadata
- **Response:** Same shape as standard generation, plus `therapyMetadata` with frequency details

#### 7.6 DELETE /api/account/keys/:keyId — Delete API Key

- **Auth:** Supabase session bearer token
- **Params:** `keyId` (UUID)
- **Logic:**
  - Verify the key belongs to the authenticated user.
  - Delete the key from the `api_keys` table.
  - Return 204 No Content on success.
- **CORS:** DELETE method must be explicitly allowed in the Fastify CORS config.

#### 7.7 Suggested Future Endpoints

- `GET /api/tracks/:id` – Retrieve metadata and download link for a previous track
- `GET /api/providers` – List active providers and their limitations

### 8. Data Model (Logical Data Model)

#### 8.1 User

- `id`
- `email`
- `plan` (free/basic/pro/ultra)
- `stripe_customer_id`
- `created_at`, `updated_at`

#### 8.2 ApiKey

- `id`
- `user_id`
- `key_hash`
- `label`
- `status` (active/disabled/revoked)
- `last_used_at`
- `created_at`

#### 8.3 Track

- `id`
- `user_id`
- `storage_path`
- `wav_storage_path` (nullable, for plans with WAV access)
- `format` (mp3/wav)
- `duration_seconds`
- `mood`, `style`, `tempo`, `length`, `intensity`
- `provider`
- `provider_version` (optional; for multi-provider and audio model versioning in v2)
- `plan`
- `track_type` (`standard` or `therapy`, default `standard`)
- `therapy_frequency` (JSONB, nullable — stores `{ band, hz, solfeggioHz, label }` for therapy tracks)
- `created_at`

Notes:

- The `intensity` field is defined as `NOT NULL` with a default of `'medium'` in the DB, so it has a well-defined default when not provided by the user.
- The `provider` and `provider_version` fields are kept simple in v1 (e.g., just `openai` or `suno` with no version), but will be fully populated in v2 with multi-provider and model version support.
- `tempo` and `length` have no upper limit constraints — only `>= 1` minimums.
- `therapy_frequency` is a JSONB column to avoid over-normalization for optional data. It is null for standard tracks.

#### 8.4 UsageDaily

- `id`
- `user_id`
- `date`
- `requests_count`

Notes:

- A `UNIQUE` constraint and composite index are defined on `(user_id, date)` to prevent duplicate records and enable fast reads/updates.
- In the `generate` flow, the `(user_id, date)` record is always read or created within a transaction (upsert with lock) so that the `requests_count` counter is correctly updated under concurrent requests.

#### 8.5 StripeWebhookEvent

- `id`
- `stripe_event_id`
- `type`
- `payload` (JSON)
- `processed_at`
- `created_at`

### 9. Rate Limiting & Quota per Plan

Per the revenue model:

- **Free**
  - `1` generate request per day
  - Watermarked output
- **Basic – €9/month**
  - `5` requests per day
  - MP3 192kbps output
- **Pro – €19/month**
  - `20` requests per day
  - MP3 + WAV output
  - Higher priority in queue (if queue exists)
- **Ultra – €49/month**
  - `100` requests per day
  - Commercial use license (stored in metadata)

**Logic in code:**

- Before each generate:
  - Begin transaction in DB (Supabase Postgres)
  - Read/create `UsageDaily` record for `(user_id, date)` with lock
  - If `requests_count >= plan_limit` → `quota_exceeded` error
  - Increment `requests_count` and commit
  - (Future) If short-term rate limiting is needed, Redis or a separate service can be added (not used in MVP)

### 10. Watermarking for the Free Plan

- Add a very subtle noise/tone layer in the last 3–5 seconds of the track
- Use ffmpeg to mix the watermark layer onto the provider output
- Watermark configuration (gain, length, sound type) is adjustable via env/config
- The watermark file is stored as a static audio file (e.g., short WAV) in Supabase Storage and is only mixed at generate time; no need to produce a watermark on every request.
- The `watermarked` and `commercial_license` flags in the output metadata explicitly indicate commercial use status for the client.

### 11. Security & Best Practices

- HTTPS only; no plain HTTP support
- Restricted CORS (specific origins for internal use and future panel; API key clients are more permissive but controlled)
- API keys are never stored as plain text (hash only, using secure algorithms like bcrypt or argon2)
- Full prompts and other sensitive text inputs are not logged; only minimal metadata (such as user ID, plan, track duration) is recorded in logs.
- Limited TTL for download Signed URLs (e.g., 1 hour)

### 12. Deployment & Environments

- **Environments:** dev / staging / prod
- **Config:** Via env vars (Supabase URL/keys, Supabase storage bucket, provider keys, Stripe keys)
- **Monitoring:**
  - APM/metrics (Prometheus, OpenTelemetry, or a hosted service)
  - Alerts on high error rates or increased latency

### 13. Dashboard UX Features

- **Tab system:** Ambient Music | Therapy tabs for switching between generation modes.
- **Generation progress:** Full-panel progress view with percentage and ETA, unified across both ambient and therapy generation.
- **Unified post-generation:** Both modes show a success toast and return to the settings form. Generated track appears in the library.
- **Form disabling:** All generation inputs are disabled during generation.
- **Therapy questionnaire:** Multi-step flow: goal → body area/emotion → genre → cultural healing mode → settings.
- **Exclusive audio playback:** Playing one track auto-pauses all others via audio element refs.
- **Library filters:** Search input (matches mood, style, tempo, duration, plan, intensity), type dropdown (Ambient/Therapy), mood dropdown, style dropdown.
- **Therapy frequency chips:** Therapy track cards display wave band, binaural Hz, Solfeggio Hz, and label as badge chips.
- **Library pagination:** Shows 3 tracks initially, "Load more" button expands to scrollable container (`max-h-[600px]`).
- **API key lifecycle:** Create, select (with "in-use" green dot), copy, delete.
- **Branding:** Deciwa footer, custom gold-themed DaisyUI design system.

### 14. Version Roadmap

- **v1 (current):**
  - Multi-provider fallback (Replicate MusicGen + OpenAI Audio)
  - Sync generation with progress estimation
  - MP3 + WAV (plan-dependent)
  - Intelligent prompt engine with mood/style descriptors
  - Music therapy with binaural beats, Solfeggio tones, 3-phase session phasing, smart tempo
  - Cultural healing modes (Chinese Five-Element, Indian Raga, Ottoman Maqam)
  - Therapy frequency metadata stored and displayed in library
  - Professional fade-in (3s) and fade-out (4s) on all tracks
  - No hard limits on track parameters
  - Unified post-generation UX: toast + library for both ambient and therapy
  - Full dashboard with type/mood/style filters, pagination, exclusive playback
  - API key lifecycle (create, select, delete)
  - Stripe billing integration
  - Deciwa branding

- **v2:**
  - Async queue (simple job queue) for longer tracks
  - Additional endpoints for track management
  - Real-time progress via WebSocket or SSE

- **v3:**
  - Advanced parameters (seed, loopable, variation)
  - User analytics (usage and cost dashboard)
