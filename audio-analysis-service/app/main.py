"""FastAPI application entrypoint for the Audio Analysis Service."""
from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .analyzer import analyze, load_audio_from_path, load_audio_from_url
from .schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("audio-analysis-service")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Audio Analysis Service starting (version %s)", __version__)
    yield
    logger.info("Audio Analysis Service shutting down")


app = FastAPI(
    title="Sonic Therapy — Audio Analysis Service",
    description=(
        "Python/FastAPI microservice that extracts objective acoustic features "
        "(BPM, key, spectral descriptors, therapy-specific energy ratios) from "
        "generated therapy tracks using librosa. Feeds the evaluation framework "
        "with automatic metrics alongside user ratings."
    ),
    version=__version__,
    lifespan=lifespan,
)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=HealthResponse, tags=["system"])
async def healthz() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="audio-analysis-service",
        version=__version__,
    )


@app.post("/analyze", response_model=AnalyzeResponse, tags=["analysis"])
async def analyze_endpoint(payload: AnalyzeRequest) -> AnalyzeResponse:
    if not payload.url and not payload.path:
        raise HTTPException(
            status_code=400,
            detail="Either 'url' or 'path' must be provided.",
        )

    try:
        if payload.url:
            data, original_sr = await load_audio_from_url(str(payload.url))
            file_url = str(payload.url)
            file_path = None
        else:
            data, original_sr = load_audio_from_path(payload.path)  # type: ignore[arg-type]
            file_url = None
            file_path = payload.path
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to load audio")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load audio: {exc}",
        ) from exc

    try:
        return analyze(
            data,
            original_sr,
            target_bpm=payload.target_bpm,
            target_brainwave_hz=payload.target_brainwave_hz,
            file_url=file_url,
            file_path=file_path,
        )
    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {exc}",
        ) from exc
