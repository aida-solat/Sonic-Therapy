'use client';

import type { AccountTrackItem, AudioAnalysisRecommendation } from '@/lib/types';

interface AudioAnalysisBadgeProps {
  track: Pick<
    AccountTrackItem,
    'audioAnalysis' | 'audioAnalysisScore' | 'audioAnalysisStatus'
  >;
}

const RECOMMENDATION_STYLES: Record<
  AudioAnalysisRecommendation,
  { badge: string; icon: string; label: string }
> = {
  excellent: {
    badge: 'badge-success',
    icon: '★',
    label: 'Excellent',
  },
  good: {
    badge: 'badge-info',
    icon: '✓',
    label: 'Good',
  },
  acceptable: {
    badge: 'badge-warning',
    icon: '•',
    label: 'Acceptable',
  },
  poor: {
    badge: 'badge-error',
    icon: '!',
    label: 'Poor',
  },
};

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Small visual indicator showing the objective audio analysis outcome
 * for a track. Rendered inline alongside other track metadata chips.
 *
 * States:
 * - `completed` + analysis present → recommendation badge + score %
 * - `pending`                      → neutral "Analyzing…" chip with spinner
 * - `failed`                       → warning chip explaining retry
 * - `skipped`                      → nothing (service disabled on deployment)
 */
export function AudioAnalysisBadge({ track }: AudioAnalysisBadgeProps) {
  const status = track.audioAnalysisStatus ?? 'pending';

  if (status === 'skipped') {
    return null;
  }

  if (status === 'pending') {
    return (
      <span
        className="badge badge-sm badge-ghost gap-1 text-base-content/60"
        title="Objective audio analysis is still running — refresh in a few seconds."
      >
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-base-content/40"
          aria-hidden="true"
        />
        Analyzing…
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className="badge badge-sm badge-ghost border-warning/40 text-warning"
        title="Audio analysis failed. An admin retry will run automatically."
      >
        Analysis failed
      </span>
    );
  }

  // status === 'completed'
  const analysis = track.audioAnalysis;
  const score = track.audioAnalysisScore ?? analysis?.therapyFitScore ?? null;

  if (!analysis || score === null) {
    // Completed but no payload — very unlikely; fall back to score-only chip.
    return null;
  }

  const style = RECOMMENDATION_STYLES[analysis.recommendation];

  const tooltip = [
    `Therapy-fit: ${formatPercent(score)} (${style.label})`,
    `Tempo: ${analysis.tempoBpm.toFixed(1)} BPM${
      analysis.bpmError != null ? ` (±${analysis.bpmError.toFixed(1)})` : ''
    }`,
    `Key: ${analysis.keyEstimate}`,
    `Low-freq energy: ${formatPercent(analysis.therapy.lowFrequencyEnergyRatio)}`,
  ].join(' · ');

  return (
    <span
      className={`badge badge-sm ${style.badge} gap-1`}
      title={tooltip}
      aria-label={`Audio analysis: ${style.label}, ${formatPercent(score)} fit`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label} · {formatPercent(score)}
    </span>
  );
}
