"""Unit tests for the analyzer module.

These tests synthesize audio in-memory (sine tones, white noise, mixtures)
so they don't require any external files or network access.
"""
from __future__ import annotations

import numpy as np
import pytest

from app.analyzer import (
    ANALYSIS_SR,
    _energy_ratio_in_band,
    _estimate_key,
    _recommendation_from_score,
    _therapy_fit_score,
    analyze,
)


def _sine_wave(freq_hz: float, duration_s: float, sr: int = ANALYSIS_SR) -> np.ndarray:
    t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
    return 0.5 * np.sin(2 * np.pi * freq_hz * t).astype(np.float32)


def test_analyze_returns_sane_duration_and_rate() -> None:
    y = _sine_wave(220.0, 3.0)
    # Emulate stereo input shape (samples, channels)
    stereo = np.stack([y, y], axis=1)
    result = analyze(stereo, ANALYSIS_SR)

    assert result.channels == 2
    assert result.sample_rate == ANALYSIS_SR
    assert 2.9 < result.duration_seconds < 3.1


def test_analyze_detects_low_frequency_energy_ratio() -> None:
    # A 60 Hz sine should be entirely in the low-frequency band (<200 Hz).
    y = _sine_wave(60.0, 4.0)
    stereo = np.stack([y, y], axis=1)
    result = analyze(stereo, ANALYSIS_SR)

    assert result.therapy.low_frequency_energy_ratio > 0.9
    assert result.therapy.high_frequency_energy_ratio < 0.05


def test_analyze_detects_high_frequency_energy_ratio() -> None:
    # A 6 kHz sine should be entirely in the high-frequency band (>4 kHz).
    y = _sine_wave(6000.0, 3.0)
    stereo = np.stack([y, y], axis=1)
    result = analyze(stereo, ANALYSIS_SR)

    assert result.therapy.high_frequency_energy_ratio > 0.9
    assert result.therapy.low_frequency_energy_ratio < 0.05


def test_analyze_bpm_error_when_target_provided() -> None:
    y = _sine_wave(220.0, 3.0)
    stereo = np.stack([y, y], axis=1)
    result = analyze(stereo, ANALYSIS_SR, target_bpm=60.0)

    assert result.bpm_error is not None
    assert result.bpm_error >= 0


def test_energy_ratio_sums_to_roughly_one_across_full_band() -> None:
    y = _sine_wave(1000.0, 2.0)
    low = _energy_ratio_in_band(y, ANALYSIS_SR, 0, 500)
    mid = _energy_ratio_in_band(y, ANALYSIS_SR, 500, 2000)
    high = _energy_ratio_in_band(y, ANALYSIS_SR, 2000, ANALYSIS_SR // 2)
    assert 0.99 < (low + mid + high) < 1.01


def test_estimate_key_returns_valid_format() -> None:
    # A-major chord-ish signal (A=440, C#=554.37, E=659.25)
    t = np.linspace(0, 4.0, ANALYSIS_SR * 4, endpoint=False)
    signal = (
        np.sin(2 * np.pi * 440 * t)
        + np.sin(2 * np.pi * 554.37 * t)
        + np.sin(2 * np.pi * 659.25 * t)
    ).astype(np.float32) / 3.0
    key = _estimate_key(signal, ANALYSIS_SR)

    assert key.endswith(("major", "minor"))
    root = key.split(" ")[0]
    assert root in {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (0.95, "excellent"),
        (0.80, "good"),
        (0.60, "acceptable"),
        (0.30, "poor"),
    ],
)
def test_recommendation_thresholds(score: float, expected: str) -> None:
    assert _recommendation_from_score(score) == expected


def test_therapy_fit_score_is_bounded() -> None:
    score = _therapy_fit_score(
        tempo_bpm=60.0,
        target_bpm=60.0,
        low_freq_ratio=0.55,
        sub_bass_ratio=0.15,
        rms_std=0.02,
        target_brainwave_hz=4.0,
    )
    assert 0.0 <= score <= 1.0


def test_therapy_fit_score_perfect_match_is_high() -> None:
    score = _therapy_fit_score(
        tempo_bpm=60.0,
        target_bpm=60.0,
        low_freq_ratio=0.55,
        sub_bass_ratio=0.15,
        rms_std=0.02,
        target_brainwave_hz=4.0,
    )
    assert score > 0.85
