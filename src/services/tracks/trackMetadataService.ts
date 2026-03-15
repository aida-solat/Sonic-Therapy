import { supabaseClient } from '../../infra/supabaseClient';
import { GenerateRequest, PlanType, TrackMetadata } from '../../types/domain';
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

export interface TrackMetadataService {
  save(params: SaveTrackParams): Promise<TrackMetadata>;
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
};
