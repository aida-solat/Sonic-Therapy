# Ambient Background Music Generator API

[![CI](https://github.com/aida-solat/Ambient-Background-Music-Generator-API/actions/workflows/ci.yml/badge.svg)](https://github.com/aida-solat/Ambient-Background-Music-Generator-API/actions/workflows/ci.yml)

Ambient Background Music Generator API built with **Fastify + TypeScript**, using **Supabase** for data/storage, **Stripe** for billing**, and an **audio provider** (OpenAI in v1) for generating ambient background tracks.

The API is designed for programmatic usage (no frontend) and exposes endpoints for generating tracks, managing API keys, retrieving user/plan info, and handling Stripe webhooks.

---

## Features

- **Fastify + TypeScript** backend
- **Supabase Postgres** for:
  - `app_users`, `api_keys`, `tracks`, `usage_daily`, `stripe_webhook_events`
- **Supabase Storage** for audio files
- **Stripe** billing + webhooks for plan management
- **Audio provider abstraction** (v1: OpenAI-based provider)
- **Per-plan quotas** and daily usage tracking
- **Vitest** test suite, ESLint, and CI workflow

---

## Prerequisites

- **Node.js** `20.x` (LTS recommended)
- **pnpm** `10.x`
- A **Supabase project** (URL + service role key)
- A **Stripe account** (secret key + webhook secret)
- An **OpenAI (or compatible) audio API key/endpoint**
- **FFmpeg** available on the system `PATH`

### Install pnpm

```bash
npm install -g pnpm
```

or (macOS Homebrew):

```bash
brew install pnpm
```

### Install FFmpeg

macOS:

```bash
brew install ffmpeg
```

Ubuntu:

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

### Supported operating systems

- **Linux** (recommended)
- **macOS**
- **Windows** (via WSL)

---

## Setup

```bash
pnpm install
pnpm typecheck
pnpm build
```

---

## Environment Variables

```bash
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
OPENAI_API_KEY=sk-openai-xxx
OPENAI_AUDIO_ENDPOINT=https://api.openai.com/v1/audio/generations
WATERMARK_FILE_PATH=/absolute/path/to/watermark.wav
```

Apply migration:

- `supabase/migrations/0001_init.sql`

---

## Running Locally

### Development server

```bash
pnpm dev
```

### Production build & start

```bash
pnpm build
pnpm start
```

---

## Testing

```bash
pnpm test
pnpm typecheck
pnpm lint
```

---

## Stripe Webhook

Endpoint:

- `POST /webhooks/stripe`

Local development:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

---

## API Endpoints

- `POST /api/generate`
- `GET /api/me`
- `POST /api/keys`
- `POST /webhooks/stripe`
- `GET /healthz`

---

## Deployment

This project **cannot run on serverless/edge platforms** because it depends on:

- FFmpeg child processes  
- Local filesystem (temp WAV/MP3)
- Long-running Fastify server

Supported deployment targets:

- Render
- Railway
- Fly.io
- Docker / VM / Bare metal

---

## Architecture (High-level)

```mermaid
flowchart LR
  User[Client / API Consumer]
  API[Fastify API]
  Auth[API Key Auth Service]
  Usage[Usage Service]
  Prompt[Prompt Engine]
  Provider[Audio Provider (OpenAI)]
  FFmpeg[FFmpeg Pipeline]
  Storage[Supabase Storage]
  DB[(Supabase Postgres)]

  User --> API
  API --> Auth
  Auth --> DB
  API --> Usage
  Usage --> DB
  API --> Prompt
  Prompt --> Provider
  Provider --> FFmpeg
  FFmpeg --> Storage
  FFmpeg --> DB
  API --> Storage
  API --> DB
  API --> User
```

---

## License

MIT
