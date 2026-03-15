# Portfolio Overview — Sonic Therapy Platform

## Positioning

**Sonic Therapy Platform** — a personalized music therapy product that generates AI-powered therapeutic audio sessions. Built by **Deciwa** as a portfolio piece demonstrating domain-specific audio science on top of full-stack product engineering.

The core idea: a user describes their condition (chronic pain, insomnia, anxiety), chooses the music genre they love, sets session duration, and receives a scientifically-grounded therapy track with binaural beat entrainment, Solfeggio frequencies, and optional cultural healing traditions.

It combines:

- a therapy engine: 20 goals → brainwave frequency mapping → 3-phase session phasing → smart tempo → Solfeggio tones
- cultural healing modes: Chinese Five-Element, Indian Raga Chikitsa, Ottoman Maqam
- AI music generation: intelligent prompt engine with RAG-augmented retrieval + multi-model fallback
- full product surface: Next.js dashboard, Fastify API, Supabase auth/storage, Stripe billing
- ffmpeg audio pipeline: binaural beat mixing, Solfeggio layering, normalization, fades, watermarking

## What This Demonstrates

- **domain-specific audio science** — brainwave frequency mapping, binaural beat generation, entrainment ramping, Solfeggio tone mixing from research literature
- **personalization engine** — therapeutic goal + music genre + duration + cultural mode = thousands of unique session configurations
- **cultural healing traditions** — Chinese Five-Element pentatonic, Indian Raga Chikitsa, Ottoman Maqam quarter-tone systems with goal-specific musical guidance
- **AI prompt engineering** — three iterations (static → descriptor-based → RAG-augmented), benchmarked across 4 strategies
- **multi-model orchestration** — provider abstraction with automatic fallback and observability
- **evaluation framework** — 4-dimension ratings, per-provider comparison, mood×style quality matrix
- **product engineering** — auth, quotas, billing, media pipeline, storage, delivery, evaluation, dashboard UX
- **operational credibility** — SQL migrations, OpenAPI contract, integration tests, CI

## Strong Review Targets

- `src/services/therapy/frequencyMappingService.ts` — brainwave mapping, session phasing, smart tempo
- `src/services/therapy/binauralMixService.ts` — binaural beat + Solfeggio mixing via ffmpeg
- `src/services/therapy/therapyPromptEngine.ts` — therapy-aware prompts with cultural healing modes
- `src/services/tracks/generateTrackService.ts` — multi-step pipeline orchestration
- `src/services/prompt/promptEngine.ts` — mood/style/intensity-aware prompt engineering
- `src/services/prompt/promptRetrieval.ts` — RAG with cosine similarity
- `src/providers/audio/multiProviderWithFallback.ts` — multi-model fallback
- `src/services/evaluation/evaluationService.ts` — track rating and provider evaluation
- `web/components/therapy-panel.tsx` — multi-step therapy questionnaire
- `web/components/dashboard-app.tsx` — full studio dashboard
- `scripts/benchmark-prompts.ts` — prompt strategy benchmarking

## Suggested Demo Flow

1. Open the landing page — show therapy-first positioning and personalization narrative.
2. Sign in to the studio dashboard with Supabase Auth.
3. Switch to **Therapy** tab — walk through the questionnaire: goal → body area → genre → culture → settings.
4. Generate a therapy track — show full-panel progress with percentage and ETA.
5. Show success toast and therapy track in the Library with frequency metadata chips (wave band, binaural Hz, Solfeggio Hz).
6. Play the therapy track — explain the 3-phase entrainment happening in the audio.
7. Switch to **Ambient Music** tab — generate an ambient track to show the general music capability.
8. Play both tracks — first one auto-pauses (exclusive playback).
9. Rate a track with star ratings across 4 dimensions.
10. Use Library filters — search, filter by track type/mood/style.
11. Create and manage API keys for developer integration.
12. Open Stripe checkout or billing portal.
13. Point to the engineering docs and integration tests.

## Interview Summary

If asked for a short explanation, describe it this way:

> I built a personalized music therapy platform as Deciwa — a one-person engineering studio. Users describe their condition, choose their music genre, and set session length — the platform maps their goal to brainwave frequencies, generates AI music in their preferred genre, and layers binaural beats with 3-phase entrainment ramping and Solfeggio tones. It also supports three cultural healing traditions: Chinese Five-Element, Indian Raga, and Ottoman Maqam. The tech stack is Fastify + Next.js + Supabase + Stripe, with an ffmpeg pipeline for binaural beat mixing, normalization, and fades. I also built an ambient music generation mode with a RAG-augmented prompt engine, multi-model fallback, a 4-dimension evaluation framework, and full operational infrastructure — quota enforcement, webhook idempotency, migrations, and integration tests.
