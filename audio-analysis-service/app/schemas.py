"""Pydantic schemas for the audio analysis API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequest(BaseModel):
    """Request to analyze an audio file.

    Either `url` or `path` must be provided.
    """

    url: HttpUrl | None = Field(
        default=None,
        description="Publicly accessible URL of the audio file (mp3, wav, flac, ogg).",
    )
    path: str | None = Field(
        default=None,
        description="Local filesystem path (only used when the service has shared volume access).",
    )
    target_bpm: float | None = Field(
        default=None,
        ge=30,
        le=220,
        description="Optional target BPM from the therapy engine, used to compute bpm_error.",
    )
    target_brainwave_hz: float | None = Field(
        default=None,
        ge=0.1,
        le=100,
        description="Optional target brainwave frequency (delta/theta/alpha/beta/gamma) for low-frequency energy validation.",
    )


class SpectralFeatures(BaseModel):
    """Timbral / spectral descriptors (averaged over the track)."""

    spectral_centroid_hz: float = Field(..., description="Brightness — higher = more high-frequency energy.")
    spectral_bandwidth_hz: float = Field(..., description="Spread of frequencies around the centroid.")
    spectral_rolloff_hz: float = Field(..., description="Frequency below which 85% of spectral energy is concentrated.")
    zero_crossing_rate: float = Field(..., description="Noisiness proxy — higher = more noise-like.")


class DynamicsFeatures(BaseModel):
    """Loudness and dynamics descriptors."""

    rms_mean: float = Field(..., description="Mean RMS energy (loudness).")
    rms_std: float = Field(..., description="Std of RMS — higher = more dynamic, lower = more consistent.")
    dynamic_range_db: float = Field(..., description="Peak-to-mean ratio in dB.")


class TherapyFeatures(BaseModel):
    """Therapy-specific features (low-frequency energy, binaural suitability)."""

    sub_bass_energy_ratio: float = Field(
        ...,
        description="Proportion of energy in the 20–80 Hz band — important for binaural carrier audibility.",
    )
    low_frequency_energy_ratio: float = Field(
        ...,
        description="Proportion of energy below 200 Hz — relevant for relaxation.",
    )
    high_frequency_energy_ratio: float = Field(
        ...,
        description="Proportion of energy above 4 kHz — relevant for alertness / focus therapy goals.",
    )


class AnalyzeResponse(BaseModel):
    """Full analysis response."""

    file_url: str | None = None
    file_path: str | None = None
    duration_seconds: float
    sample_rate: int
    channels: int

    tempo_bpm: float = Field(..., description="Estimated tempo using librosa beat tracker.")
    bpm_error: float | None = Field(
        default=None,
        description="Absolute difference vs target_bpm, if provided.",
    )

    key_estimate: str = Field(..., description="Estimated musical key (e.g. 'C major', 'A minor').")
    harmonic_percussive_ratio: float = Field(
        ...,
        description="Ratio of harmonic to percussive energy — higher = more melodic, lower = more rhythmic.",
    )

    spectral: SpectralFeatures
    dynamics: DynamicsFeatures
    therapy: TherapyFeatures

    therapy_fit_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Composite 0–1 score: how well the track matches its declared therapy target (BPM + frequency emphasis + dynamics consistency).",
    )
    recommendation: Literal["excellent", "good", "acceptable", "poor"] = Field(
        ...,
        description="Human-readable verdict derived from therapy_fit_score.",
    )


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
