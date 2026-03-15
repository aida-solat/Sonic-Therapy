import { supabaseClient } from '../../infra/supabaseClient';
import { logger } from '../../infra/logger';
import { AppError } from '../../types/errors';

export interface TrackRating {
  trackId: string;
  userId: string;
  satisfaction: number; // 1-5
  moodAccuracy: number; // 1-5: did the output match the requested mood?
  styleAccuracy: number; // 1-5: did the output match the requested style?
  audioQuality: number; // 1-5: overall audio fidelity
  comment?: string | null;
}

export interface TrackEvaluationSummary {
  trackId: string;
  avgSatisfaction: number;
  avgMoodAccuracy: number;
  avgStyleAccuracy: number;
  avgAudioQuality: number;
  overallScore: number;
  totalRatings: number;
}

export interface ProviderEvaluationSummary {
  provider: string;
  avgSatisfaction: number;
  avgMoodAccuracy: number;
  avgStyleAccuracy: number;
  avgAudioQuality: number;
  overallScore: number;
  totalRatings: number;
  totalTracks: number;
}

export interface EvaluationService {
  rateTrack(rating: TrackRating): Promise<void>;
  getTrackEvaluation(trackId: string): Promise<TrackEvaluationSummary | null>;
  getProviderEvaluations(): Promise<ProviderEvaluationSummary[]>;
  getMoodStyleMatrix(): Promise<Record<string, Record<string, number>>>;
}

export const evaluationService: EvaluationService = {
  async rateTrack(rating: TrackRating): Promise<void> {
    if (
      rating.satisfaction < 1 || rating.satisfaction > 5 ||
      rating.moodAccuracy < 1 || rating.moodAccuracy > 5 ||
      rating.styleAccuracy < 1 || rating.styleAccuracy > 5 ||
      rating.audioQuality < 1 || rating.audioQuality > 5
    ) {
      throw new AppError('All ratings must be between 1 and 5', 'validation_error', 400);
    }

    const { error } = await supabaseClient
      .from('track_ratings')
      .upsert(
        {
          track_id: rating.trackId,
          user_id: rating.userId,
          satisfaction: rating.satisfaction,
          mood_accuracy: rating.moodAccuracy,
          style_accuracy: rating.styleAccuracy,
          audio_quality: rating.audioQuality,
          comment: rating.comment ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'track_id,user_id' },
      );

    if (error) {
      logger.error({ err: error }, 'Failed to save track rating');
      throw new AppError('Failed to save rating', 'db_error', 500);
    }
  },

  async getTrackEvaluation(trackId: string): Promise<TrackEvaluationSummary | null> {
    const { data, error } = await supabaseClient
      .from('track_ratings')
      .select('satisfaction, mood_accuracy, style_accuracy, audio_quality')
      .eq('track_id', trackId);

    if (error) {
      logger.error({ err: error }, 'Failed to fetch track ratings');
      throw new AppError('Failed to fetch ratings', 'db_error', 500);
    }

    if (!data || data.length === 0) return null;

    const avg = (field: string) =>
      data.reduce((sum, r) => sum + (r as any)[field], 0) / data.length;

    const avgSatisfaction = avg('satisfaction');
    const avgMoodAccuracy = avg('mood_accuracy');
    const avgStyleAccuracy = avg('style_accuracy');
    const avgAudioQuality = avg('audio_quality');

    // Weighted overall score
    const overallScore =
      avgSatisfaction * 0.3 +
      avgMoodAccuracy * 0.25 +
      avgStyleAccuracy * 0.25 +
      avgAudioQuality * 0.2;

    return {
      trackId,
      avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
      avgMoodAccuracy: Math.round(avgMoodAccuracy * 100) / 100,
      avgStyleAccuracy: Math.round(avgStyleAccuracy * 100) / 100,
      avgAudioQuality: Math.round(avgAudioQuality * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
      totalRatings: data.length,
    };
  },

  async getProviderEvaluations(): Promise<ProviderEvaluationSummary[]> {
    const { data, error } = await supabaseClient
      .from('track_ratings')
      .select(`
        satisfaction,
        mood_accuracy,
        style_accuracy,
        audio_quality,
        tracks!inner(provider)
      `);

    if (error) {
      logger.error({ err: error }, 'Failed to fetch provider evaluations');
      throw new AppError('Failed to fetch provider evaluations', 'db_error', 500);
    }

    if (!data || data.length === 0) return [];

    const byProvider: Record<string, typeof data> = {};
    for (const row of data) {
      const provider = (row as any).tracks?.provider ?? 'unknown';
      if (!byProvider[provider]) byProvider[provider] = [];
      byProvider[provider].push(row);
    }

    return Object.entries(byProvider).map(([provider, ratings]) => {
      const avg = (field: string) =>
        ratings.reduce((sum, r) => sum + (r as any)[field], 0) / ratings.length;

      const avgSatisfaction = avg('satisfaction');
      const avgMoodAccuracy = avg('mood_accuracy');
      const avgStyleAccuracy = avg('style_accuracy');
      const avgAudioQuality = avg('audio_quality');
      const overallScore =
        avgSatisfaction * 0.3 +
        avgMoodAccuracy * 0.25 +
        avgStyleAccuracy * 0.25 +
        avgAudioQuality * 0.2;

      const uniqueTracks = new Set(ratings.map((r: any) => r.track_id));

      return {
        provider,
        avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
        avgMoodAccuracy: Math.round(avgMoodAccuracy * 100) / 100,
        avgStyleAccuracy: Math.round(avgStyleAccuracy * 100) / 100,
        avgAudioQuality: Math.round(avgAudioQuality * 100) / 100,
        overallScore: Math.round(overallScore * 100) / 100,
        totalRatings: ratings.length,
        totalTracks: uniqueTracks.size,
      };
    });
  },

  async getMoodStyleMatrix(): Promise<Record<string, Record<string, number>>> {
    const { data, error } = await supabaseClient
      .from('track_ratings')
      .select(`
        satisfaction,
        tracks!inner(mood, style)
      `);

    if (error) {
      logger.error({ err: error }, 'Failed to fetch mood/style matrix');
      throw new AppError('Failed to fetch evaluation matrix', 'db_error', 500);
    }

    if (!data || data.length === 0) return {};

    const matrix: Record<string, Record<string, { total: number; count: number }>> = {};

    for (const row of data) {
      const mood = (row as any).tracks?.mood ?? 'unknown';
      const style = (row as any).tracks?.style ?? 'unknown';
      const score = (row as any).satisfaction;

      if (!matrix[mood]) matrix[mood] = {};
      if (!matrix[mood][style]) matrix[mood][style] = { total: 0, count: 0 };
      matrix[mood][style].total += score;
      matrix[mood][style].count += 1;
    }

    const result: Record<string, Record<string, number>> = {};
    for (const [mood, styles] of Object.entries(matrix)) {
      result[mood] = {};
      for (const [style, { total, count }] of Object.entries(styles)) {
        result[mood][style] = Math.round((total / count) * 100) / 100;
      }
    }

    return result;
  },
};
