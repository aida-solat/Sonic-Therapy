"""Core audio analysis using librosa.

Extracts objective acoustic features relevant to music therapy:
- Tempo (BPM) — compared against the therapy engine's target BPM
- Key estimation via chroma features
- Spectral descriptors (brightness, bandwidth, rolloff, noisiness)
- Dynamics (RMS loudness, consistency, dynamic range)
- Therapy-specific energy distribution (sub-bass, low-, high-frequency ratios)

All features are computed from mono-downmixed audio at 22 050 Hz to balance
accuracy with throughput. Total analysis time is typically < 1 s per track.
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

import httpx
import librosa
import numpy as np
import soundfile as sf

from .schemas import (
    AnalyzeResponse,
    DynamicsFeatures,
    SpectralFeatures,
    TherapyFeatures,
)

logger = logging.getLogger(__name__)

# Standard analysis sample rate — librosa defaults + widely used for MIR tasks.
ANALYSIS_SR = 22_050

# Key estimation lookup (Krumhansl–Schmuckler key profiles simplified).
_KEY_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
]
_MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
)
_MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
)


async def load_audio_from_url(url: str) -> tuple[np.ndarray, int]:
    """Download an audio file from a URL and decode it to a numpy array."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        buffer = io.BytesIO(response.content)
    data, original_sr = sf.read(buffer, always_2d=True)
    return data, original_sr


def load_audio_from_path(path: str) -> tuple[np.ndarray, int]:
    """Load an audio file from a local path."""
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")
    data, original_sr = sf.read(str(file_path), always_2d=True)
    return data, original_sr


def _estimate_key(y: np.ndarray, sr: int) -> str:
    """Estimate musical key using chroma features + Krumhansl correlation."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_avg = chroma.mean(axis=1)

    major_correlations = np.zeros(12)
    minor_correlations = np.zeros(12)
    for shift in range(12):
        rotated = np.roll(chroma_avg, -shift)
        major_correlations[shift] = np.corrcoef(rotated, _MAJOR_PROFILE)[0, 1]
        minor_correlations[shift] = np.corrcoef(rotated, _MINOR_PROFILE)[0, 1]

    best_major = int(np.argmax(major_correlations))
    best_minor = int(np.argmax(minor_correlations))

    if major_correlations[best_major] >= minor_correlations[best_minor]:
        return f"{_KEY_NAMES[best_major]} major"
    return f"{_KEY_NAMES[best_minor]} minor"


def _energy_ratio_in_band(
    y: np.ndarray,
    sr: int,
    low_hz: float,
    high_hz: float,
) -> float:
    """Compute the fraction of total spectral energy within [low_hz, high_hz]."""
    stft = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    band_mask = (freqs >= low_hz) & (freqs <= high_hz)
    band_energy = float(stft[band_mask, :].sum())
    total_energy = float(stft.sum()) + 1e-9
    return band_energy / total_energy


def _therapy_fit_score(
    tempo_bpm: float,
    target_bpm: float | None,
    low_freq_ratio: float,
    sub_bass_ratio: float,
    rms_std: float,
    target_brainwave_hz: float | None,
) -> float:
    """Composite 0–1 score combining therapy-relevant signals.

    Weights:
    - BPM alignment (if target provided): 40 %
    - Low-frequency energy (relaxation bands need it): 25 %
    - Sub-bass presence (binaural carriers need it): 20 %
    - Dynamics consistency (less erratic = better for entrainment): 15 %
    """
    components: list[tuple[float, float]] = []  # (weight, score)

    if target_bpm is not None and target_bpm > 0:
        bpm_diff = abs(tempo_bpm - target_bpm)
        bpm_score = max(0.0, 1.0 - bpm_diff / 30.0)  # 0 at 30 BPM off, 1 at perfect match
        components.append((0.40, bpm_score))
    else:
        # no target → give a neutral 0.7 so we don't penalize
        components.append((0.40, 0.7))

    # Low-freq emphasis — aim for ~0.4–0.7 depending on target brainwave
    low_freq_target = 0.55 if (target_brainwave_hz and target_brainwave_hz < 15) else 0.40
    low_freq_score = max(0.0, 1.0 - abs(low_freq_ratio - low_freq_target) * 2)
    components.append((0.25, low_freq_score))

    # Sub-bass presence — 0.05–0.25 is healthy
    sub_bass_score = 1.0 if 0.05 <= sub_bass_ratio <= 0.25 else max(
        0.0, 1.0 - abs(sub_bass_ratio - 0.15) * 5
    )
    components.append((0.20, sub_bass_score))

    # Dynamics — lower std of RMS is better (less jarring) but not zero
    rms_std_score = max(0.0, 1.0 - min(rms_std * 10.0, 1.0))
    components.append((0.15, rms_std_score))

    total_weight = sum(w for w, _ in components)
    weighted = sum(w * s for w, s in components)
    return round(weighted / total_weight, 4)


def _recommendation_from_score(score: float) -> str:
    if score >= 0.85:
        return "excellent"
    if score >= 0.70:
        return "good"
    if score >= 0.50:
        return "acceptable"
    return "poor"


def analyze(
    data: np.ndarray,
    original_sr: int,
    *,
    target_bpm: float | None = None,
    target_brainwave_hz: float | None = None,
    file_url: str | None = None,
    file_path: str | None = None,
) -> AnalyzeResponse:
    """Run the full analysis pipeline on a decoded audio array."""
    channels = int(data.shape[1]) if data.ndim == 2 else 1
    mono = np.asarray(data).mean(axis=1) if data.ndim == 2 and data.shape[1] > 1 else data.reshape(-1)

    y = librosa.resample(mono.astype(np.float32), orig_sr=original_sr, target_sr=ANALYSIS_SR)
    duration_s = float(len(y) / ANALYSIS_SR)

    # Tempo
    tempo_result = librosa.beat.tempo(y=y, sr=ANALYSIS_SR)
    tempo_bpm = float(tempo_result[0])

    # Harmonic / percussive decomposition
    harmonic, percussive = librosa.effects.hpss(y)
    harmonic_energy = float(np.sum(harmonic**2)) + 1e-9
    percussive_energy = float(np.sum(percussive**2)) + 1e-9
    harmonic_percussive_ratio = round(harmonic_energy / percussive_energy, 4)

    # Key estimation
    key_estimate = _estimate_key(y, ANALYSIS_SR)

    # Spectral features
    spectral_centroid = float(librosa.feature.spectral_centroid(y=y, sr=ANALYSIS_SR).mean())
    spectral_bandwidth = float(librosa.feature.spectral_bandwidth(y=y, sr=ANALYSIS_SR).mean())
    spectral_rolloff = float(librosa.feature.spectral_rolloff(y=y, sr=ANALYSIS_SR).mean())
    zcr = float(librosa.feature.zero_crossing_rate(y).mean())

    # Dynamics
    rms = librosa.feature.rms(y=y).flatten()
    rms_mean = float(rms.mean())
    rms_std = float(rms.std())
    peak = float(np.max(np.abs(y))) + 1e-9
    dynamic_range_db = float(20.0 * np.log10(peak / (rms_mean + 1e-9)))

    # Therapy-specific band energies
    sub_bass_ratio = _energy_ratio_in_band(y, ANALYSIS_SR, 20.0, 80.0)
    low_freq_ratio = _energy_ratio_in_band(y, ANALYSIS_SR, 0.0, 200.0)
    high_freq_ratio = _energy_ratio_in_band(y, ANALYSIS_SR, 4000.0, 11025.0)

    therapy_fit = _therapy_fit_score(
        tempo_bpm=tempo_bpm,
        target_bpm=target_bpm,
        low_freq_ratio=low_freq_ratio,
        sub_bass_ratio=sub_bass_ratio,
        rms_std=rms_std,
        target_brainwave_hz=target_brainwave_hz,
    )

    return AnalyzeResponse(
        file_url=file_url,
        file_path=file_path,
        duration_seconds=round(duration_s, 3),
        sample_rate=ANALYSIS_SR,
        channels=channels,
        tempo_bpm=round(tempo_bpm, 2),
        bpm_error=round(abs(tempo_bpm - target_bpm), 2) if target_bpm else None,
        key_estimate=key_estimate,
        harmonic_percussive_ratio=harmonic_percussive_ratio,
        spectral=SpectralFeatures(
            spectral_centroid_hz=round(spectral_centroid, 2),
            spectral_bandwidth_hz=round(spectral_bandwidth, 2),
            spectral_rolloff_hz=round(spectral_rolloff, 2),
            zero_crossing_rate=round(zcr, 5),
        ),
        dynamics=DynamicsFeatures(
            rms_mean=round(rms_mean, 5),
            rms_std=round(rms_std, 5),
            dynamic_range_db=round(dynamic_range_db, 2),
        ),
        therapy=TherapyFeatures(
            sub_bass_energy_ratio=round(sub_bass_ratio, 4),
            low_frequency_energy_ratio=round(low_freq_ratio, 4),
            high_frequency_energy_ratio=round(high_freq_ratio, 4),
        ),
        therapy_fit_score=therapy_fit,
        recommendation=_recommendation_from_score(therapy_fit),  # type: ignore[arg-type]
    )
