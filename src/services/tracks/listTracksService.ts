import { supabaseClient } from '../../infra/supabaseClient';
import { AppError } from '../../types/errors';
import { supabaseStorageService } from '../storage/supabaseStorageService';

export interface ListedTrack {
  id: string;
  format: 'mp3' | 'wav';
  createdAt: string;
  downloadUrl: string;
  downloadUrlWav?: string;
  formatWav?: 'wav';
  trackType: 'standard' | 'therapy';
  therapyFrequency?: { band: string; hz: number; solfeggioHz?: number; label: string } | null;
  metadata: {
    tempo: number;
    mood: string;
    duration: number;
    style: string;
    intensity: 'soft' | 'medium' | 'high';
    provider: 'openai';
    providerVersion?: string | null;
    plan: 'free' | 'basic' | 'pro' | 'ultra';
    watermarked: boolean;
    commercialLicense: boolean;
  };
}

export interface ListTracksService {
  listForUser(userId: string): Promise<ListedTrack[]>;
}

function deriveWavStoragePath(primaryStoragePath: string): string | null {
  if (!primaryStoragePath.endsWith('.mp3')) {
    return null;
  }

  return primaryStoragePath.slice(0, -4) + '.wav';
}

export const listTracksService: ListTracksService = {
  async listForUser(userId: string): Promise<ListedTrack[]> {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select(
        'id, format, created_at, storage_path, wav_storage_path, tempo, mood, duration_seconds, style, intensity, provider, provider_version, plan, watermarked, commercial_license, track_type, therapy_frequency',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to load tracks', 'db_error', 500);
    }

    const results = await Promise.all(
      (data ?? []).map(async (row): Promise<ListedTrack | null> => {
        let downloadUrl: string;
        try {
          downloadUrl = await supabaseStorageService.getDownloadUrl({
            storagePath: row.storage_path,
            expiresInSeconds: 3600,
          });
        } catch {
          // File missing from storage — skip this track
          return null;
        }

        const wavStoragePath = row.wav_storage_path ?? deriveWavStoragePath(row.storage_path);
        let downloadUrlWav: string | undefined;
        if (wavStoragePath && (row.plan === 'pro' || row.plan === 'ultra')) {
          try {
            downloadUrlWav = await supabaseStorageService.getDownloadUrl({
              storagePath: wavStoragePath,
              expiresInSeconds: 3600,
            });
          } catch {
            downloadUrlWav = undefined;
          }
        }

        return {
          id: row.id,
          format: row.format,
          createdAt: row.created_at,
          downloadUrl,
          ...(downloadUrlWav ? { downloadUrlWav, formatWav: 'wav' as const } : {}),
          trackType: (row.track_type ?? 'standard') as 'standard' | 'therapy',
          ...(row.therapy_frequency
            ? {
                therapyFrequency: row.therapy_frequency as {
                  band: string;
                  hz: number;
                  solfeggioHz?: number;
                  label: string;
                },
              }
            : {}),
          metadata: {
            tempo: row.tempo,
            mood: row.mood,
            duration: row.duration_seconds,
            style: row.style,
            intensity: row.intensity,
            provider: row.provider,
            providerVersion: row.provider_version,
            plan: row.plan,
            watermarked: row.watermarked,
            commercialLicense: row.commercial_license,
          },
        };
      }),
    );

    return results.filter((t): t is ListedTrack => t !== null);
  },
};
