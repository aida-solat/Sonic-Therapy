import { supabaseClient } from '../../infra/supabaseClient';
import {
  AudioAnalysisResult,
  AudioAnalysisStatus,
  GenerateRequest,
  PlanType,
  TrackMetadata,
} from '../../types/domain';
import { AppError } from '../../types/errors';

export interface SaveTrackParams {
  trackId: string;
  userId: string;
  plan: PlanType;
  request: GenerateRequest;
  provider: 'openai';
  providerVersion?: string | null;
  watermarked: boolean;
  commercialLicense: boolean;
  storagePath: string;
  wavStoragePath?: string | null;
  durationSeconds: number;
  format: 'mp3' | 'wav';
  trackType?: 'standard' | 'therapy';
  therapyFrequency?: { band: string; hz: number; solfeggioHz?: number; label: string } | null;
}

export interface UpdateAudioAnalysisParams {
  trackId: string;
  status: AudioAnalysisStatus;
  result?: AudioAnalysisResult;
}

export interface TrackMetadataService {
  save(params: SaveTrackParams): Promise<TrackMetadata>;
  updateAudioAnalysis(params: UpdateAudioAnalysisParams): Promise<void>;
}

export const trackMetadataService: TrackMetadataService = {
  async save(params: SaveTrackParams): Promise<TrackMetadata> {
    const { data, error } = await supabaseClient
      .from('tracks')
      .insert({
        id: params.trackId,
        user_id: params.userId,
        storage_path: params.storagePath,
        wav_storage_path: params.wavStoragePath ?? null,
        format: params.format,
        duration_seconds: params.durationSeconds,
        mood: params.request.mood,
        style: params.request.style,
        tempo: params.request.tempo,
        length: params.request.length,
        intensity: params.request.intensity ?? 'medium',
        provider: params.provider,
        provider_version: params.providerVersion,
        plan: params.plan,
        watermarked: params.watermarked,
        commercial_license: params.commercialLicense,
        track_type: params.trackType ?? 'standard',
        therapy_frequency: params.therapyFrequency ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new AppError('Failed to save track metadata', 'db_error', 500);
    }

    const track: TrackMetadata = {
      id: data.id,
      userId: data.user_id,
      durationSeconds: data.duration_seconds,
      mood: data.mood,
      style: data.style,
      tempo: data.tempo,
      length: data.length,
      intensity: data.intensity,
      provider: data.provider,
      providerVersion: data.provider_version,
      plan: data.plan,
      watermarked: data.watermarked,
      commercialLicense: data.commercial_license,
      storagePath: data.storage_path,
      wavStoragePath: data.wav_storage_path,
      format: data.format,
      trackType: data.track_type ?? 'standard',
      therapyFrequency: data.therapy_frequency ?? null,
      createdAt: new Date(data.created_at),
    };

    return track;
  },

  async updateAudioAnalysis(params: UpdateAudioAnalysisParams): Promise<void> {
    const { trackId, status, result } = params;

    const update: Record<string, unknown> = {
      audio_analysis_status: status,
    };

    if (result) {
      update.audio_analysis = result;
      update.audio_analysis_score = result.therapyFitScore;
      update.audio_analysis_at = new Date().toISOString();
    }

    const { error } = await supabaseClient.from('tracks').update(update).eq('id', trackId);

    if (error) {
      throw new AppError(
        `Failed to update audio analysis status for track ${trackId}: ${error.message}`,
        'db_error',
        500,
      );
    }
  },
};
