import { AudioAnalysisResult } from '../../types/domain';
import { supabaseStorageService } from '../storage/supabaseStorageService';
import { trackMetadataService } from '../tracks/trackMetadataService';
import { audioAnalysisClient } from './audioAnalysisClient';

export interface TriggerAnalysisParams {
  trackId: string;
  storagePath: string;
  targetBpm?: number;
  targetBrainwaveHz?: number;
}

export interface AudioAnalysisService {
  /**
   * Fire-and-forget analysis trigger. Never throws; failures are logged and
   * persisted as `audio_analysis_status = 'failed'` so a background job can
   * retry later.
   *
   * The caller does not need to await this — analysis happens asynchronously
   * and does not affect the user-facing track delivery latency.
   */
  triggerInBackground(params: TriggerAnalysisParams): void;

  /**
   * Synchronous variant (used by tests and potential future retry jobs).
   * Returns the analysis result or `null` when the service is disabled.
   */
  runAndPersist(params: TriggerAnalysisParams): Promise<AudioAnalysisResult | null>;
}

const ANALYSIS_URL_TTL_SECONDS = 60 * 10; // 10 min is plenty for Python to fetch

export const audioAnalysisService: AudioAnalysisService = {
  triggerInBackground(params: TriggerAnalysisParams): void {
    // Fire-and-forget. We intentionally do NOT await this promise —
    // errors inside runAndPersist are already swallowed and logged.
    void this.runAndPersist(params).catch((error) => {
      // Final safety net — should never reach here because runAndPersist
      // already handles errors, but log just in case.
      // eslint-disable-next-line no-console
      console.error('[audio-analysis] unexpected top-level error', {
        trackId: params.trackId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  },

  async runAndPersist(params: TriggerAnalysisParams): Promise<AudioAnalysisResult | null> {
    const { trackId, storagePath, targetBpm, targetBrainwaveHz } = params;

    if (!audioAnalysisClient.isEnabled()) {
      await trackMetadataService
        .updateAudioAnalysis({ trackId, status: 'skipped' })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('[audio-analysis] failed to mark skipped', {
            trackId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return null;
    }

    try {
      const analysisUrl = await supabaseStorageService.getDownloadUrl({
        storagePath,
        expiresInSeconds: ANALYSIS_URL_TTL_SECONDS,
      });

      const result = await audioAnalysisClient.analyze({
        url: analysisUrl,
        targetBpm,
        targetBrainwaveHz,
      });

      await trackMetadataService.updateAudioAnalysis({
        trackId,
        status: 'completed',
        result,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error('[audio-analysis] analysis failed', { trackId, error: message });
      await trackMetadataService
        .updateAudioAnalysis({ trackId, status: 'failed' })
        .catch((persistError) => {
          // eslint-disable-next-line no-console
          console.error('[audio-analysis] failed to persist failure status', {
            trackId,
            error: persistError instanceof Error ? persistError.message : String(persistError),
          });
        });
      return null;
    }
  },
};
