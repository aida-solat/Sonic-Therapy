'use client';

import Link from 'next/link';
import { useState } from 'react';

/* ── Card metadata ── */
const docs = [
  {
    id: 'portfolio',
    title: 'Portfolio Overview',
    description:
      'Project positioning as a personalized music therapy platform, what it demonstrates, review targets, demo flow, and interview summary.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    sections: [
      {
        heading: 'Positioning',
        content: `**Sonic Therapy Platform** — a personalized music therapy product that generates AI-powered therapeutic audio sessions. Built by **Deciwa** as a portfolio piece demonstrating domain-specific audio science on top of full-stack product engineering.

The core idea: a user describes their condition (chronic pain, insomnia, anxiety), chooses the music genre they love, sets session duration, and receives a scientifically-grounded therapy track with binaural beat entrainment, Solfeggio frequencies, and optional cultural healing traditions.

It combines:
- Therapy engine: 20 goals → brainwave frequency mapping → 3-phase session phasing → smart tempo → Solfeggio tones
- Cultural healing modes: Chinese Five-Element, Indian Raga Chikitsa, Ottoman Maqam
- AI music generation: intelligent prompt engine with RAG-augmented retrieval + multi-model fallback
- Full product surface: Next.js dashboard, Fastify API, Supabase auth/storage, Stripe billing
- ffmpeg audio pipeline: binaural beat mixing, Solfeggio layering, normalization, fades, watermarking`,
      },
      {
        heading: 'What This Demonstrates',
        content: `- **Domain-specific audio science** — brainwave frequency mapping, binaural beat generation, entrainment ramping, Solfeggio tone mixing from research literature
- **Personalization engine** — therapeutic goal + music genre + duration + cultural mode = thousands of unique session configurations
- **Cultural healing traditions** — Chinese Five-Element pentatonic, Indian Raga Chikitsa, Ottoman Maqam quarter-tone systems with goal-specific musical guidance
- **AI prompt engineering** — three iterations (static → descriptor-based → RAG-augmented), benchmarked across 4 strategies
- **Multi-model orchestration** — provider abstraction with automatic fallback and observability
- **Evaluation framework** — 4-dimension ratings, per-provider comparison, mood×style quality matrix
- **Product engineering** — auth, quotas, billing, media pipeline, storage, delivery, evaluation, dashboard UX
- **Operational credibility** — SQL migrations, OpenAPI contract, integration tests, CI`,
      },
      {
        heading: 'Strong Review Targets',
        content: `- \`src/services/therapy/frequencyMappingService.ts\` — brainwave mapping, session phasing, smart tempo
- \`src/services/therapy/binauralMixService.ts\` — binaural beat + Solfeggio mixing via ffmpeg
- \`src/services/therapy/therapyPromptEngine.ts\` — therapy-aware prompts with cultural healing modes
- \`src/services/tracks/generateTrackService.ts\` — multi-step pipeline orchestration
- \`src/services/prompt/promptEngine.ts\` — mood/style/intensity-aware prompt engineering
- \`src/services/prompt/promptRetrieval.ts\` — RAG with cosine similarity
- \`src/providers/audio/multiProviderWithFallback.ts\` — multi-model fallback
- \`src/services/evaluation/evaluationService.ts\` — track rating and provider evaluation
- \`web/components/therapy-panel.tsx\` — multi-step therapy questionnaire
- \`web/components/dashboard-app.tsx\` — full studio dashboard
- \`scripts/benchmark-prompts.ts\` — prompt strategy benchmarking`,
      },
      {
        heading: 'Suggested Demo Flow',
        content: `1. Open the landing page — show therapy-first positioning and personalization narrative
2. Sign in to the studio dashboard with Supabase Auth
3. Switch to **Therapy** tab — walk through the questionnaire: goal → body area → genre → culture → settings
4. Generate a therapy track — show full-panel progress with percentage and ETA
5. Show success toast and therapy track in the Library with frequency metadata chips (wave band, binaural Hz, Solfeggio Hz)
6. Play the therapy track — explain the 3-phase entrainment happening in the audio
7. Switch to **Ambient Music** tab — generate an ambient track to show the general music capability
8. Play both tracks — first one auto-pauses (exclusive playback)
9. Rate a track with star ratings across 4 dimensions
10. Use Library filters — search, filter by track type/mood/style
11. Create and manage API keys for developer integration
12. Open Stripe checkout or billing portal
13. Point to the engineering docs and integration tests`,
      },
    ],
  },
  {
    id: 'framing',
    title: 'Interview Framing',
    description:
      'Talking points for interviews: therapy personalization, audio science decisions, provider abstraction, prompt quality, evaluation, tradeoffs, and production concerns.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    sections: [
      {
        heading: '1. Problem Framing',
        content: `Existing music therapy tools fall into two categories: basic tone generators that play a fixed sine wave, or expensive standalone apps that offer no personalization. Neither lets a user say "I have chronic back pain, I like jazz, give me a 10-minute session" and receive a scientifically-grounded therapy track in their preferred genre.

**The problem I solved:** how do you combine domain-specific audio science (brainwave entrainment, Solfeggio frequencies, session phasing) with AI music generation and full product infrastructure (auth, billing, storage, evaluation) into a single personalized therapy platform?

The result: users describe their condition, choose their music, set session length, and receive a unique therapy track with binaural beat entrainment, frequency ramping, and optional cultural healing modes — all generated on demand.`,
      },
      {
        heading: '2. Therapy Audio Science',
        content: `The therapy engine maps 20 goals to brainwave frequency bands (delta/theta/alpha/beta/gamma) and Solfeggio tones (174–963 Hz). Each session uses **3-phase entrainment:**

1. **Induction (15%)** — ramp from alert state down to therapeutic target
2. **Deepening (70%)** — hold core frequency, Solfeggio active
3. **Emergence (15%)** — gentle ramp back to alpha

**Smart tempo** maps each brainwave band to research-based BPM (55–100). **Cultural healing modes** inject goal-specific musical guidance: Chinese Five-Element pentatonic scales, Indian Raga Chikitsa, Ottoman Maqam quarter-tone systems.

All implemented via ffmpeg \`aevalsrc\` with piecewise-linear frequency sweep expressions — not library calls.`,
      },
      {
        heading: '3. Provider Abstraction',
        content: `An \`AudioProvider\` interface abstracts away everything model-specific. The \`MultiProviderWithFallback\` orchestrator tries providers in priority order with latency logging and error aggregation.

Current providers:
- **Replicate MusicGen** (Meta's music-specific model) — primary
- **OpenAI Audio** — fallback

Adding a third provider means implementing the interface and registering it. Zero changes to generation service, routes, or dashboard. The latency data feeds into the evaluation framework for data-driven provider selection.`,
      },
      {
        heading: '4. Prompt Quality Strategy',
        content: `Three iterations:

**v1 — Static template.** "romantic jazz" and "calm ambient" produced nearly identical outputs.

**v2 — Descriptor-based (production).** Each mood, style, and intensity maps to specific musical descriptors. 192+ distinct prompt variations.

**v3 — RAG-augmented (experimental).** Cosine similarity over curated musical knowledge fragments. Top-3 injected as "musical direction."

For therapy tracks, a separate \`therapyPromptEngine\` builds prompts from the therapeutic goal, genre, and cultural healing mode — producing genre-appropriate music that complements the binaural beat layer.`,
      },
      {
        heading: '5. Key Tradeoffs',
        content: `- **Cultural healing as prompt injection** instead of dedicated synthesis engines — simplicity vs. fidelity, right level for portfolio
- **Sync generation** instead of async job queue — simpler API contract, async-ready schema
- **In-memory RAG** instead of pgvector — demonstrates the pattern, upgrade path documented
- **ffmpeg child process** instead of WebAssembly — industry standard for binaural beats + Solfeggio + fades
- **Two auth models** — API keys for developers, Supabase sessions for dashboard users
- **Postgres quotas** instead of Redis — atomic upsert, no extra infrastructure`,
      },
      {
        heading: '6. Production Concerns',
        content: `- **Quota enforcement** — atomic Postgres RPC, no race conditions
- **Webhook idempotency** — Stripe events deduplicated via \`stripe_webhook_events\` table
- **Signed asset delivery** — 1-hour TTL, no permanent public URLs
- **Temp file cleanup** — \`finally\` block ensures cleanup even on failure
- **Audio fades** — 3s fade-in, 4s fade-out via ffmpeg \`afade\` filters
- **Therapy frequency metadata** — JSONB column, returned in API, displayed as badge chips
- **4-dimension evaluation** — satisfaction, mood accuracy, style accuracy, audio quality
- **Plan-aware output** — watermarking, WAV access, commercial license enforced in pipeline`,
      },
    ],
  },
  {
    id: 'ai-engineering',
    title: 'AI Engineering Notes',
    description:
      'Therapy audio science, brainwave entrainment, cultural healing modes, prompt engineering evolution, multi-model architecture, RAG, evaluation, and benchmarking.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8a2 2 0 0 0 0 4h8a2 2 0 0 0 0-4h-2c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
        <line x1="10" y1="20" x2="14" y2="20" />
      </svg>
    ),
    sections: [
      {
        heading: '1. Therapy Audio Science',
        content: `**Frequency Mapping:** 20 therapeutic goals → 5 brainwave bands (delta 0.1–4 Hz, theta 4–8, alpha 8–13, beta 13–30, gamma 30–100) + Solfeggio tones (174–963 Hz).

**Smart Tempo:** Research-based BPM per brainwave band — delta 55–62 (parasympathetic), theta 60–68, alpha 68–75, beta 80–90, gamma 90–100.

**Session Phasing (3-Phase Entrainment):**
1. Induction (15%) — ramp from alert state to target Hz
2. Deepening (70%) — hold therapeutic frequency, Solfeggio active
3. Emergence (15%) — ramp back to alpha (~10 Hz)

Implemented via ffmpeg \`aevalsrc\` with piecewise-linear frequency sweep expressions — not library calls.`,
      },
      {
        heading: '2. Cultural Healing Modes',
        content: `Three traditions, each with goal-specific musical guidance injected into the AI prompt:

**Chinese Five-Element:** Pentatonic scale mapped to organ systems — Wood (liver, anger), Fire (heart, joy), Earth (spleen, worry), Metal (lungs, grief), Water (kidneys, fear).

**Indian Raga Chikitsa:** Classical ragas matched to time-of-day and therapeutic condition. Each raga carries specific emotional and physiological associations.

**Ottoman Maqam:** Modal system with quarter-tone intervals. Historically used in Ottoman hospital music therapy (especially Edirne).

Each mode provides \`musicalGuidance\` + goal-specific \`refinement\` — the AI model receives culturally-specific instrumentation and scale instructions alongside the therapeutic context.`,
      },
      {
        heading: '3. Prompt Engineering',
        content: `**Ambient prompts** evolved through three iterations:

**v1 — Static Template:** All mood/style combos sounded the same.
**v2 — Descriptor-Based (Production):** 192+ distinct prompt variations from domain-specific musical descriptors.
**v3 — RAG-Augmented:** Cosine similarity retrieval over curated knowledge base. Top-3 fragments injected as "musical direction."

**Therapy prompts** use a separate \`therapyPromptEngine\` that builds from therapeutic goal + genre + cultural mode — producing genre-appropriate music that complements the binaural beat layer.

**Prompt Structure:** Identity statement first (models weight earlier tokens more), constraints last (guardrails).`,
      },
      {
        heading: '4. Multi-Model Architecture & RAG',
        content: `**Provider Abstraction:** \`AudioProvider\` interface with \`MultiProviderWithFallback\` orchestrator. MusicGen (primary), OpenAI Audio (fallback). Latency logging and error aggregation per attempt.

**RAG Pipeline:** User Request → Tag Embedding (bag-of-tags, IDF weighting) → Cosine Similarity → Top-K Retrieval → Augmented Prompt.

**Knowledge Base:** 20+ curated musical production fragments. Upgrade path: external embeddings (text-embedding-3-small), pgvector, feedback loop from high-rated tracks.`,
      },
      {
        heading: '5. Evaluation & Benchmarking',
        content: `**Track Evaluation:** 4 dimensions (1–5): satisfaction (30%), mood accuracy (25%), style accuracy (25%), audio quality (20%). Aggregated per-track, per-provider, and mood×style matrix.

**Prompt Benchmarking:** 4 strategies across 6 test cases:
- Simple template: ~55–60%
- Descriptor-based: ~75–80% (production choice)
- Narrative: ~65–70%
- Technical-musical: ~70–75%

Scored on: Specificity (25%), Mood Accuracy (25%), Style Fidelity (20%), Distinctiveness (20%), Clarity (10%).`,
      },
    ],
  },
  {
    id: 'adr',
    title: 'Architecture Decisions',
    description:
      '25 ADRs covering stack choices, auth, billing, prompt engine, therapy, cultural modes, fades, and UX unification.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    sections: [
      {
        heading: 'Foundation (ADR 001–010)',
        content: `- **001** Node.js 24 + Fastify + TypeScript
- **002** Supabase (Postgres + Auth + Storage) as primary platform
- **003** No Redis or job queue in v1
- **004** Supabase Storage bucket for audio files
- **005** Single audio provider in v1 (with multi-provider readiness)
- **006** Free / Basic / Pro / Ultra plan model
- **007** ffmpeg watermarking for Free plan
- **008** UsageDaily in DB for quota management (atomic upsert)
- **009** Standardized \`{ error: { code, message, status } }\` responses
- **010** Synchronous generation in v1, async-ready response schema`,
      },
      {
        heading: 'Product & UX (ADR 011–015)',
        content: `- **011** Dashboard + API dual surface (API keys for devs, sessions for dashboard)
- **012** Intelligent prompt engine with mood/style descriptors
- **013** API key deletion via dashboard and API
- **014** Generation progress bar, exclusive playback, library filters, pagination
- **015** Deciwa branding with custom DaisyUI theme`,
      },
      {
        heading: 'AI & Evaluation (ADR 016–019)',
        content: `- **016** Multi-model provider architecture with automatic fallback
- **017** RAG-augmented prompt retrieval (in-memory, cosine similarity)
- **018** Track evaluation with 4 rating dimensions and mood×style matrix
- **019** Prompt benchmarking framework (4 strategies, 6 test cases, 5 criteria)`,
      },
      {
        heading: 'Therapy & Audio (ADR 020–025)',
        content: `- **020** Music therapy with binaural beat entrainment — 20 goals, 5 brainwave bands, Solfeggio tones, 3-phase session phasing, smart tempo, frequency metadata JSONB
- **021** Cultural healing modes via prompt injection — Chinese Five-Element, Indian Raga, Ottoman Maqam
- **022** Professional audio fades — 3s fade-in, 4s fade-out via ffmpeg \`afade\`
- **023** Removed hard limits on track parameters — no max tempo/length/duration
- **024** Unified post-generation UX — toast + library for both ambient and therapy
- **025** Therapy frequency metadata as JSONB column — \`{ band, hz, solfeggioHz, label }\``,
      },
    ],
  },
  {
    id: 'blueprint',
    title: 'Implementation Blueprint',
    description:
      'Folder structure, service layer design, SQL schema, endpoint skeletons, provider adapters, ffmpeg pipeline, and dashboard architecture.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    sections: [
      {
        heading: 'Project Structure',
        content: `\`\`\`
src/
  routes/          → generate, therapy, keys, me, account, stripeWebhook, health
  schemas/         → generate, therapy, keys, me, account, stripeWebhook, error
  services/
    auth/          → apiKeyAuth, apiKeyManagement, apiKeyRateLimit, userSessionAuth
    billing/       → planService, stripeWebhook, stripeBilling
    usage/         → usageService
    tracks/        → generateTrack, trackMetadata, listTracks
    therapy/       → frequencyMapping, therapyPromptEngine, binauralMix, generateTherapyTrack
    prompt/        → promptEngine, promptRetrieval (RAG)
    storage/       → storageService, supabaseStorageService
  providers/audio/ → audioProvider, defaultAudio, replicateMusicGen, multiProviderWithFallback
  types/           → domain, errors
web/
  components/      → dashboard-app, therapy-panel
  lib/             → api, types, download, supabase-browser
\`\`\``,
      },
      {
        heading: 'Database Schema',
        content: `**6 tables:** app_users, api_keys, tracks, usage_daily, stripe_webhook_events, track_ratings

**7 migrations:** 0001_init → 0002_increment_usage_daily_rpc → 0003_add_wav_storage_path → 0004_add_track_ratings → 0005_add_track_type → 0006_remove_track_limits → 0007_add_therapy_frequency

**Key fields in tracks:** \`track_type\` (standard/therapy), \`therapy_frequency\` (JSONB), \`wav_storage_path\`, no upper limits on tempo/length.`,
      },
      {
        heading: 'ffmpeg Pipeline',
        content: `1. Receive raw file from audio provider
2. Convert to base format (WAV, 44.1kHz, 16-bit stereo)
3. Normalize loudness (\`loudnorm\` filter)
4. Apply fade-in (3s) and fade-out (4s)
5. Add watermark (Free plan only)
6. For therapy: mix binaural beats + Solfeggio tones with 3-phase frequency ramping
7. Encode to MP3 192kbps (+ WAV for Pro/Ultra)
8. Upload to Supabase Storage
9. Cleanup temp files in \`finally\` block`,
      },
      {
        heading: 'Dashboard Architecture',
        content: `**dashboard-app.tsx:** Session management, API key lifecycle, tab system (Ambient/Therapy), generation with progress + ETA, unified toast post-generation, library with type/mood/style filters, frequency metadata chips, exclusive playback, Stripe billing.

**therapy-panel.tsx:** Multi-step questionnaire (goal → body area/emotion → genre → cultural healing mode → settings), 20 goals in 5 categories, cultural healing mode selection, full-panel progress, toast on success.

**Theme:** Custom DaisyUI "ambient" theme — dark navy (#0f1b2d), gold primary (#d4af37), gold-tinted borders, Deciwa footer.`,
      },
    ],
  },
  {
    id: 'soft-design',
    title: 'Soft Design',
    description:
      'Product vision as a personalized therapy platform, API surface, therapy engine, billing, dashboard UX, and version roadmap.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    sections: [
      {
        heading: 'Product Vision',
        content: `A personalized music therapy platform that generates AI-powered therapeutic audio sessions. Users describe their condition, choose their music genre, set session duration, and receive a scientifically-grounded therapy track with binaural beat entrainment and optional cultural healing traditions.

**Secondary surface:** ambient background music generation for content creators — same AI pipeline, different personalization axis (mood/style/intensity instead of therapeutic goal).

**Outputs:** MP3 (192kbps), WAV (Pro+), frequency metadata JSON for therapy tracks.`,
      },
      {
        heading: 'API Endpoints',
        content: `- **POST /api/generate/therapy** — Personalized therapy session (goal, genre, durationSeconds, intensity, optional culturalMode)
- **POST /api/generate** — Ambient music generation (mood, style, tempo, length, intensity)
- **POST /api/keys** — Create API key
- **GET /api/me** — View usage and plan info
- **GET/POST/DELETE /api/account/*** — Dashboard operations (tracks, keys, billing, ratings & evaluation)
- **POST /webhooks/stripe** — Payment confirmation
- **GET /healthz** — Health check`,
      },
      {
        heading: 'Billing & Plans',
        content: `- **Free:** 1 session/day, watermarked MP3
- **Basic (€9/mo):** 5 sessions/day, clean MP3, cultural healing modes
- **Pro (€19/mo):** 20 sessions/day, MP3 + WAV
- **Ultra (€49/mo):** 100 sessions/day, commercial license

Quota enforced via atomic Postgres RPC. Stripe webhooks for plan upgrades (idempotent processing).`,
      },
      {
        heading: 'Dashboard UX',
        content: `- Tab system: Therapy | Ambient Music
- Therapy questionnaire: goal → body area/emotion → genre → cultural healing mode → settings
- Full-panel progress view with percentage and ETA
- Unified post-generation: toast + library for both modes
- Library: search, type/mood/style filters, pagination, frequency metadata chips
- 4-dimension star ratings per track
- Exclusive audio playback
- API key lifecycle: create, select, copy, delete
- Deciwa branding`,
      },
      {
        heading: 'Version Roadmap',
        content: `**v1 (current):** Personalized music therapy (binaural beats, Solfeggio, session phasing, smart tempo, cultural healing modes), ambient music generation, multi-provider fallback, intelligent prompt engine, frequency metadata, professional fades, evaluation framework, Stripe billing, Deciwa branding.

**v2:** Therapy session history and progress tracking, async job queue, WebSocket/SSE progress.

**v3:** Condition-specific presets, user wellness analytics dashboard, community-rated session templates.`,
      },
    ],
  },
];

/* ── Minimal markdown-like rendering ── */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed text-base-content/70">
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('```')) return null;
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <p key={i} className="pl-4">
              {renderInline(trimmed)}
            </p>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <p key={i} className="pl-4">
              <span className="text-primary/60 mr-1.5">&#8226;</span>
              {renderInline(trimmed.slice(2))}
            </p>
          );
        }
        if (trimmed === '') return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
      {renderCodeBlocks(text)}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-base-content font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <kbd key={i} className="kbd kbd-xs font-mono text-primary/80">
          {part.slice(1, -1)}
        </kbd>
      );
    }
    return part;
  });
}

function renderCodeBlocks(text: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  const regex = /```(?:\w*)\n([\s\S]*?)```/g;
  let match;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(
      <div key={`code-${idx++}`} className="mockup-code mt-2 text-xs">
        {match[1]
          .trimEnd()
          .split('\n')
          .map((ln, j) => (
            <pre key={j} data-prefix={j + 1}>
              <code>{ln}</code>
            </pre>
          ))}
      </div>,
    );
  }
  return blocks;
}

/* ── Page ── */
export default function DocsPage() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  function toggleCard(id: string) {
    setExpandedCard((prev) => (prev === id ? null : id));
  }

  return (
    <main className="app-shell space-y-16 pb-16">
      {/* ── Navbar (matches landing page) ── */}
      <header className="navbar ambient-surface px-5 py-3">
        <div className="flex-1">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span className="font-display text-lg text-base-content">Sonic Therapy</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn btn-ghost btn-sm text-base-content/60" href="/#features">
            Features
          </Link>
          <Link className="btn btn-ghost btn-sm text-base-content/60" href="/#how-it-works">
            How It Works
          </Link>
          <Link className="btn btn-ghost btn-sm text-base-content/60" href="/#pricing">
            Pricing
          </Link>
          <Link className="btn btn-ghost btn-sm text-base-content/60" href="/#stack">
            Stack
          </Link>
          <Link className="btn btn-ghost btn-sm text-primary font-medium" href="/docs">
            Docs
          </Link>
          <Link className="btn btn-primary btn-sm" href="/dashboard">
            Open Studio
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 mb-8">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs tracking-wide text-primary">Documentation</span>
        </div>

        <h1 className="editorial-title max-w-3xl text-3xl md:text-5xl">Project Documentation</h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-base-content/60">
          Architecture decisions, engineering notes, implementation details, and design documents
          for the Sonic Therapy platform.
        </p>

        <p className="mt-3 text-sm text-base-content/40">
          {docs.length} documents &middot; Click a card to explore
        </p>
      </section>

      {/* ── Card Grid ── */}
      <section className="px-4 max-w-5xl mx-auto">
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((doc) => {
            const isExpanded = expandedCard === doc.id;
            return (
              <div
                key={doc.id}
                className={`card ambient-surface transition-all duration-300 ${
                  isExpanded
                    ? 'border-primary/40 ring-1 ring-primary/20 md:col-span-2'
                    : 'hover:border-primary/30'
                }`}
              >
                <div className="card-body p-0">
                  {/* Card header — clickable */}
                  <button
                    type="button"
                    className="flex w-full items-start gap-4 p-6 text-left"
                    onClick={() => toggleCard(doc.id)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
                      {doc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="card-title font-display text-lg text-base-content">
                        {doc.title}
                      </h3>
                      <p className="mt-1 text-sm text-base-content/50 leading-relaxed">
                        {doc.description}
                      </p>
                      <div className="mt-2">
                        <span className="badge badge-sm badge-ghost">
                          {doc.sections.length} sections
                        </span>
                      </div>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 text-primary/50 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded: inner accordion sections using DaisyUI collapse */}
                  {isExpanded && <div className="divider my-0 mx-6" />}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-1">
                      {doc.sections.map((section) => (
                        <div
                          key={`${doc.id}-${section.heading}`}
                          className="collapse collapse-arrow ambient-panel"
                        >
                          <input type="checkbox" />
                          <div className="collapse-title font-display text-sm text-base-content/80">
                            {section.heading}
                          </div>
                          <div className="collapse-content">
                            <RichText text={section.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer (matches landing page) ── */}
      <footer className="border-t border-base-300/70 pt-8 text-center">
        <p className="text-sm text-base-content/35">
          Designed & built by <span className="text-primary/70 font-medium">Deciwa</span>
        </p>
        <p className="mt-1 text-xs text-base-content/25">
          Sonic Therapy Platform &mdash; Personalized AI Music Therapy
        </p>
      </footer>
    </main>
  );
}
