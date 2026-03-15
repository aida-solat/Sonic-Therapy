# Interview Framing — Sonic Therapy Platform

Use these talking points when presenting this project in interviews, client calls, or portfolio reviews.

---

## 1. Problem Framing

Existing music therapy tools fall into two categories: basic tone generators that play a fixed sine wave, or expensive standalone apps that offer no personalization. Neither lets a user say _"I have chronic back pain, I like jazz, give me a 10-minute session"_ and receive a scientifically-grounded therapy track in their preferred genre.

**The problem I solved:** how do you combine domain-specific audio science (brainwave entrainment, Solfeggio frequencies, session phasing) with AI music generation and full product infrastructure (auth, billing, storage, evaluation) into a single personalized therapy platform?

The result: users describe their condition, choose their music, set session length, and receive a unique therapy track with binaural beat entrainment, frequency ramping, and optional cultural healing modes — all generated on demand. I also built an ambient music generation surface for general-purpose background music, using the same AI pipeline with a different personalization axis (mood/style/intensity instead of therapeutic goal).

---

## 2. Provider Abstraction

I designed an `AudioProvider` interface (`src/providers/audio/audioProvider.ts`) that abstracts away everything model-specific. Any provider that can accept a prompt, tempo, and duration and return a temp file path implements it.

Currently two providers are registered:

- **Replicate MusicGen** (Meta's music-specific model) — primary, priority 1
- **OpenAI Audio** — fallback, priority 2

The key design decision: the orchestration layer (`MultiProviderWithFallback`) does not know or care which model it is calling. Adding a third provider (e.g., Stability Audio, Suno) means implementing the interface and registering it with a priority number. Zero changes to the generation service, routes, or dashboard.

This matters because AI model APIs are unreliable. Providers change pricing, rate-limit you, go down for maintenance, or deprecate endpoints. If your system is coupled to one provider, you inherit all of that fragility.

---

## 3. Fallback Reliability

The `MultiProviderWithFallback` class (`src/providers/audio/multiProviderWithFallback.ts`) tries providers in priority order. For each attempt, it logs:

- which provider was tried
- how long it took (latency in ms)
- whether it succeeded or failed, and the error message if it failed

If the primary provider fails, the next one is attempted automatically. If all providers fail, the service aggregates every error with its latency into a single structured error response, so the caller knows exactly what happened and where.

This is not a retry loop — it is a **sequential fallback chain with observability**. The latency data also feeds into provider evaluation, so I can make informed decisions about which provider deserves primary status based on real performance data, not assumptions.

---

## 4. Prompt Quality Strategy

The prompt engine went through three iterations, which I documented in `docs/ai-engineering-notes.md`:

**v1 — Static template.** A single template string with placeholder substitution. Problem: "romantic jazz" and "calm ambient" produced nearly identical outputs because the template used the same generic descriptors for everything.

**v2 — Descriptor-based (production).** Each mood, style, and intensity maps to specific musical descriptors. For example, "romantic" maps to "warm, intimate, tender, with lush harmonies, gentle strings, and heartfelt melodies" while "jazz" maps to "jazz instrumentation, smooth saxophone, piano chords, walking bass, brushed drums, swing feel." The engine combines these dynamically — 7 moods × 7 styles × 3 intensities = 147 distinct prompt variations from a compact descriptor set. The prompt structure is also deliberate: identity statement first (models weight earlier tokens more), constraints last (guardrails).

**v3 — RAG-augmented (experimental).** A lightweight in-memory retrieval system (`src/services/prompt/promptRetrieval.ts`) with 19 curated musical knowledge fragments. Each fragment is tagged with relevant moods/styles/intensities. At query time, I compute a bag-of-tags embedding with IDF weighting, run cosine similarity against the knowledge base, and inject the top-3 fragments into the prompt as "musical direction." This gives the model concrete production techniques (e.g., "Use ii-V-I progressions with extended voicings, breathy saxophone") instead of just adjectives.

The benchmarking script (`scripts/benchmark-prompts.ts`) compares all four strategies across six test cases on five criteria. The descriptor-based approach scored 75–80%, beating both the simple template (55–60%) and the narrative approach (65–70%).

---

## 5. Evaluation Approach

I built a structured evaluation framework (`src/services/evaluation/evaluationService.ts`) with four rating dimensions:

- **Satisfaction** (30% weight) — overall user satisfaction
- **Mood accuracy** (25%) — did it actually sound like the requested mood?
- **Style accuracy** (25%) — did the instrumentation match the style?
- **Audio quality** (20%) — technical fidelity and production quality

Ratings aggregate at three levels:

1. **Per-track** — individual quality score
2. **Per-provider** — comparing MusicGen vs OpenAI across all generations
3. **Mood × style matrix** — a heatmap showing which combinations produce strong or weak results

The matrix is the most valuable output. It tells me where the prompt engine is effective (e.g., calm + ambient scores high) and where it needs work (e.g., dark + lofi underperforms). That turns subjective "this sounds off" feedback into actionable prompt engineering targets.

---

## 6. Tradeoffs I Made

**Synchronous generation instead of async job queue.**
Music generation takes 20–90 seconds. A production system at scale would use a job queue (BullMQ, etc.) with polling or webhooks. I chose synchronous request-response for v1 because it simplified the API contract, the dashboard UX (progress bar with simulated ETA), and the test surface. The response schema already includes a `status` field ready for `pending`/`processing` values when async is needed.

**Postgres-based quotas instead of Redis.**
Daily usage enforcement uses a Postgres RPC (`increment_usage_daily`) with atomic upsert, not Redis. This avoids an extra infrastructure dependency. The tradeoff is that under very high concurrency, Postgres row-level locking is slower than Redis counters. For the expected traffic volume, this is the right call — it keeps the deployment simple (single Supabase project) without sacrificing correctness.

**In-memory RAG instead of pgvector.**
The retrieval system runs entirely in-process with 19 knowledge entries and bag-of-tags embeddings. A production RAG system would use external embeddings (e.g., OpenAI text-embedding-3-small) and a vector store (pgvector is already available on Supabase). I chose the lightweight approach because it demonstrates the RAG pattern clearly and works at this scale. The upgrade path is documented and requires no architectural changes — just swap the embedding function and move the knowledge base to a table.

**Two auth models instead of one.**
API-key auth for `/api/generate` and `/api/keys` (developer surface), Supabase session tokens for `/api/account/*` (dashboard surface). This adds complexity, but it mirrors how real SaaS products work: developers integrate via API keys, end users interact via sessions. Collapsing both into one auth model would simplify the code but misrepresent how the product would actually be consumed.

**ffmpeg as a child process instead of a WebAssembly or cloud pipeline.**
Audio normalization, watermarking, fade-in/fade-out, binaural beat mixing, and format conversion run via ffmpeg spawned as a child process. This means the service needs a long-running server (not edge/serverless). The tradeoff is deployment flexibility — I cannot deploy to Vercel Edge or Cloudflare Workers. But ffmpeg is the industry standard for audio processing, and wrapping it in a WASM layer would add complexity without benefit for this use case.

**Cultural healing modes as prompt injection instead of dedicated models.**
The three cultural healing traditions (Chinese Five-Element, Indian Raga, Ottoman Maqam) are implemented as prompt-level musical guidance injected into the AI generation request, not as separate audio processing pipelines. This means the cultural authenticity depends on the AI model's training data. The tradeoff is simplicity (no separate instrument sample libraries or synthesis engines) vs. fidelity. For a portfolio piece demonstrating the pattern, prompt injection is the right level of investment.

**Unified post-generation UX (toast + library) instead of inline result views.**
Both ambient and therapy tracks show a success toast and appear in the library after generation. I considered keeping a dedicated result view for therapy tracks (with frequency info, audio player, and download buttons inline), but chose the unified approach for consistency. Therapy-specific metadata (wave band, binaural Hz, Solfeggio Hz) is shown as chips on the library track card instead.

---

## 7. How I Handled Production Concerns

**Quota enforcement.** Daily limits are enforced atomically via a Postgres RPC that increments and returns the new count in a single operation. No read-then-write race condition. If the new count exceeds the plan limit, the request is rejected immediately.

**Webhook idempotency.** Every Stripe webhook event is logged to a `stripe_webhook_events` table before processing. If the same event arrives twice, the handler checks `processed_at` — if already set, it returns silently. If processing fails mid-way, `processed_at` stays null, so the event can be retried. This prevents duplicate plan upgrades or downgrades.

**Signed asset delivery.** Generated MP3 and WAV files are stored in Supabase Storage. Download URLs are signed with a 1-hour TTL. No permanent public URLs exist. This prevents unauthorized access and hotlinking.

**Temp file cleanup.** The generation pipeline creates temporary files (raw provider output, processed MP3, optional WAV). A `finally` block in `generateTrackService` ensures cleanup happens even if upload or metadata saving fails. Cleanup errors are swallowed (best-effort) so they don't mask the real error.

**Audio fades.** All generated tracks (both ambient and therapy) include a 3-second fade-in and 4-second fade-out applied via ffmpeg `afade` filters. This ensures professional-sounding track boundaries regardless of the AI model's output.

**Therapy frequency metadata.** Therapy tracks store their frequency target (brainwave band, binaural Hz, Solfeggio Hz, label) as a JSONB column in the database. This data is returned in the API response and displayed as badge chips on therapy track cards in the library, giving users visibility into the therapeutic parameters of each track.

**Structured error responses.** Every error follows a consistent `{ error: { code, message, status } }` shape. `code` is machine-readable (e.g., `quota_exceeded`, `provider_error`), `message` is human-readable, `status` mirrors the HTTP code. API consumers can reliably parse and handle every failure mode.

**Plan-aware output rules.** The free plan gets watermarked MP3 only. Paid plans get clean MP3. Pro and Ultra get MP3 + lossless WAV. Commercial license flags are set per-plan. All of this is enforced in the generation pipeline, not in the frontend — so the rules apply equally to API consumers and dashboard users.
