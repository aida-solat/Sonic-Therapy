# Audio Analysis Service

A **Python/FastAPI microservice** that extracts objective acoustic features from generated therapy tracks using `librosa`. Part of the [Sonic Therapy Platform](../README.md) — Deciwa.

## Why It Exists

The main Sonic Therapy API (TypeScript/Fastify) handles generation, storage, billing, and auth. But objective acoustic measurement requires the **Python audio ecosystem** (`librosa`, `numpy`, `soundfile`) which has no direct TypeScript equivalent.

This service runs alongside the main API and feeds the evaluation framework with automatic metrics — complementing the 4-dimension user star ratings with ground-truth signal analysis:

```
                     ┌──────────────────────────┐
User rating (1–5) ──►│   Evaluation Framework   │
                     └──────────────────────────┘
                              ▲
                              │ objective metrics
                              │
   ┌──────────────────────────┴──────────────────────┐
   │  Audio Analysis Service (Python / FastAPI)      │
   │  • Tempo (librosa beat tracker)                 │
   │  • Key (Krumhansl–Schmuckler chroma profiles)   │
   │  • Spectral: centroid / bandwidth / rolloff     │
   │  • Dynamics: RMS mean, std, dynamic range       │
   │  • Therapy-specific band energy ratios          │
   │  • Composite therapy_fit_score (0–1)            │
   └─────────────────────────────────────────────────┘
```

## Endpoints

### `GET /healthz`

Health check.

```json
{ "status": "ok", "service": "audio-analysis-service", "version": "0.1.0" }
```

### `POST /analyze`

Analyze an audio file by URL (remote) or path (local volume).

**Request:**

```json
{
  "url": "https://storage.example.com/track.mp3",
  "target_bpm": 60,
  "target_brainwave_hz": 4.0
}
```

**Response (truncated):**

```json
{
  "duration_seconds": 600.0,
  "sample_rate": 22050,
  "channels": 2,
  "tempo_bpm": 59.8,
  "bpm_error": 0.2,
  "key_estimate": "A minor",
  "harmonic_percussive_ratio": 12.4,
  "spectral": { "spectral_centroid_hz": 1842.3, ... },
  "dynamics": { "rms_mean": 0.087, "rms_std": 0.019, ... },
  "therapy": {
    "sub_bass_energy_ratio": 0.14,
    "low_frequency_energy_ratio": 0.58,
    "high_frequency_energy_ratio": 0.12
  },
  "therapy_fit_score": 0.91,
  "recommendation": "excellent"
}
```

See [`app/schemas.py`](app/schemas.py) for the complete response schema, or visit `/docs` when the service is running for interactive Swagger UI.

## Local Development

```bash
cd audio-analysis-service

# Install (Python 3.11 or 3.12 recommended)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the dev server (auto-reload)
uvicorn app.main:app --reload --port 8000

# Open the interactive docs
open http://localhost:8000/docs
```

## Testing

```bash
pip install pytest
pytest -v
```

Tests synthesize audio in-memory (sine tones, noise, chord mixtures) — no fixture files or network access required.

## Docker

```bash
docker build -t sonic-therapy-audio-analysis .
docker run -p 8000:8000 sonic-therapy-audio-analysis
```

The Dockerfile installs `libsndfile1` and `ffmpeg` so librosa can decode `mp3`, `ogg`, `flac`, and `wav`.

## Deployment

Designed to deploy on the same providers as the main backend:

- **Render.com** (recommended): add as a second Web Service pointing to `audio-analysis-service/` with `Dockerfile` runtime.
- **Fly.io / Railway**: Docker-based, straightforward.
- **Lambda / Cloud Run**: possible but librosa cold-start is slow — prefer long-running containers.

Environment variables:

| Variable           | Default     | Purpose                            |
| ------------------ | ----------- | ---------------------------------- |
| `LOG_LEVEL`        | `INFO`      | Python logging level               |
| `ALLOWED_ORIGINS`  | `*`         | Comma-separated CORS allow-list    |
| `PORT`             | `8000`      | Port uvicorn binds to              |

## Tech Stack

- **FastAPI** 0.118 — async-first web framework with automatic OpenAPI
- **Pydantic** 2.11 — request/response validation
- **librosa** 0.11 — audio analysis (beat tracking, spectral features, HPSS, chroma)
- **numpy** 2.2 — numerical kernels
- **soundfile** — libsndfile-backed decoder
- **httpx** — async HTTP client for URL-based input
- **uvicorn** — ASGI server

## License

MIT — same as the parent [Sonic Therapy repository](../LICENSE.md).
