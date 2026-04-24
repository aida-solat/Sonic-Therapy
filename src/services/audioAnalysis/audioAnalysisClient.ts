import { config } from '../../config/env';
import { AudioAnalysisResult } from '../../types/domain';

export interface AnalyzeParams {
  url: string;
  targetBpm?: number;
  targetBrainwaveHz?: number;
}

export interface AudioAnalysisClient {
  isEnabled(): boolean;
  analyze(params: AnalyzeParams): Promise<AudioAnalysisResult>;
}

/**
 * Raw shape returned by the Python audio-analysis service (snake_case).
 * We snake_case → camelCase map it once here so the rest of the app only sees
 * the domain type `AudioAnalysisResult`.
 */
interface RawAnalyzeResponse {
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  tempo_bpm: number;
  bpm_error?: number | null;
  key_estimate: string;
  harmonic_percussive_ratio: number;
  spectral: {
    spectral_centroid_hz: number;
    spectral_bandwidth_hz: number;
    spectral_rolloff_hz: number;
    zero_crossing_rate: number;
  };
  dynamics: {
    rms_mean: number;
    rms_std: number;
    dynamic_range_db: number;
  };
  therapy: {
    sub_bass_energy_ratio: number;
    low_frequency_energy_ratio: number;
    high_frequency_energy_ratio: number;
  };
  therapy_fit_score: number;
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
}

function mapResponse(raw: RawAnalyzeResponse): AudioAnalysisResult {
  return {
    durationSeconds: raw.duration_seconds,
    sampleRate: raw.sample_rate,
    channels: raw.channels,
    tempoBpm: raw.tempo_bpm,
    bpmError: raw.bpm_error ?? null,
    keyEstimate: raw.key_estimate,
    harmonicPercussiveRatio: raw.harmonic_percussive_ratio,
    spectral: {
      spectralCentroidHz: raw.spectral.spectral_centroid_hz,
      spectralBandwidthHz: raw.spectral.spectral_bandwidth_hz,
      spectralRolloffHz: raw.spectral.spectral_rolloff_hz,
      zeroCrossingRate: raw.spectral.zero_crossing_rate,
    },
    dynamics: {
      rmsMean: raw.dynamics.rms_mean,
      rmsStd: raw.dynamics.rms_std,
      dynamicRangeDb: raw.dynamics.dynamic_range_db,
    },
    therapy: {
      subBassEnergyRatio: raw.therapy.sub_bass_energy_ratio,
      lowFrequencyEnergyRatio: raw.therapy.low_frequency_energy_ratio,
      highFrequencyEnergyRatio: raw.therapy.high_frequency_energy_ratio,
    },
    therapyFitScore: raw.therapy_fit_score,
    recommendation: raw.recommendation,
  };
}

export const audioAnalysisClient: AudioAnalysisClient = {
  isEnabled(): boolean {
    return Boolean(config.audioAnalysisUrl);
  },

  async analyze(params: AnalyzeParams): Promise<AudioAnalysisResult> {
    const baseUrl = config.audioAnalysisUrl;
    if (!baseUrl) {
      throw new Error('Audio analysis service is not configured (AUDIO_ANALYSIS_URL missing)');
    }

    const endpoint = new URL('/analyze', baseUrl).toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.audioAnalysisTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          url: params.url,
          target_bpm: params.targetBpm,
          target_brainwave_hz: params.targetBrainwaveHz,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Audio analysis service returned ${response.status}: ${errorText.slice(0, 200)}`,
        );
      }

      const raw = (await response.json()) as RawAnalyzeResponse;
      return mapResponse(raw);
    } finally {
      clearTimeout(timeout);
    }
  },
};
