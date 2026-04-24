import { supabaseClient } from '../../infra/supabaseClient';
import { AppError } from '../../types/errors';
import { audioAnalysisService } from './audioAnalysisService';

export interface RetryFailedAnalysesOptions {
  /**
   * Maximum number of tracks to retry in one invocation.
   * Default 50 — keeps HTTP request latency reasonable even on Render free tier.
   */
  limit?: number;

  /**
   * Only retry tracks whose `audio_analysis_status` is one of these values.
   * Defaults to `['failed', 'pending']`. 'pending' is included so stale pending
   * entries (e.g. if the service was down when generation completed) get
   * picked up.
   */
  statuses?: Array<'failed' | 'pending'>;

  /**
   * Skip tracks that were created in the last N seconds — avoids racing with
   * a still-in-flight analysis. Default 120 s.
   */
  minAgeSeconds?: number;
}

export interface RetryFailedAnalysesReport {
  totalCandidates: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  trackIds: string[];
}

export interface RetryFailedAnalysesService {
  run(options?: RetryFailedAnalysesOptions): Promise<RetryFailedAnalysesReport>;
}

interface TrackRow {
  id: string;
  storage_path: string;
  tempo: number | null;
  therapy_frequency: { hz?: number } | null;
}

export const retryFailedAnalysesService: RetryFailedAnalysesService = {
  async run(options: RetryFailedAnalysesOptions = {}): Promise<RetryFailedAnalysesReport> {
    const limit = options.limit ?? 50;
    const statuses = options.statuses ?? ['failed', 'pending'];
    const minAgeSeconds = options.minAgeSeconds ?? 120;

    const cutoffIso = new Date(Date.now() - minAgeSeconds * 1000).toISOString();

    const { data, error } = await supabaseClient
      .from('tracks')
      .select('id, storage_path, tempo, therapy_frequency')
      .in('audio_analysis_status', statuses)
      .lt('created_at', cutoffIso)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new AppError(
        `Failed to query tracks for retry: ${error.message}`,
        'db_error',
        500,
      );
    }

    const rows = (data ?? []) as TrackRow[];
    const report: RetryFailedAnalysesReport = {
      totalCandidates: rows.length,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      trackIds: [],
    };

    for (const row of rows) {
      report.attempted += 1;
      report.trackIds.push(row.id);

      const targetBpm = typeof row.tempo === 'number' ? row.tempo : undefined;
      const targetBrainwaveHz = row.therapy_frequency?.hz;

      const result = await audioAnalysisService.runAndPersist({
        trackId: row.id,
        storagePath: row.storage_path,
        targetBpm,
        targetBrainwaveHz,
      });

      if (result === null) {
        // Could be either "service disabled → skipped" or "analysis failed".
        // We can't tell from here without re-querying; we classify by a
        // lightweight side-channel: if the client is disabled, the orchestrator
        // marks the row 'skipped', not 'failed'. Treat all null returns as
        // non-success and let the client decide how to read the per-row state.
        report.failed += 1;
      } else {
        report.succeeded += 1;
      }
    }

    report.skipped = report.totalCandidates - report.attempted;
    return report;
  },
};
