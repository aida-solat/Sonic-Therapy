import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { TherapyRequest, TherapyResponse } from '../../types/domain';
import { apiKeyAuthService } from '../auth/apiKeyAuthService';
import { apiKeyRateLimitService } from '../auth/apiKeyRateLimitService';
import { usageService } from '../usage/usageService';
import { planService } from '../billing/planService';
import { ReplicateMusicGenProvider } from '../../providers/audio/replicateMusicGenProvider';
import { DefaultAudioProvider } from '../../providers/audio/defaultAudioProvider';
import { MultiProviderWithFallback } from '../../providers/audio/multiProviderWithFallback';
import { supabaseStorageService } from '../storage/supabaseStorageService';
import { config } from '../../config/env';
import { trackMetadataService } from '../tracks/trackMetadataService';
import { audioAnalysisService } from '../audioAnalysis/audioAnalysisService';
import { frequencyMappingService } from './frequencyMappingService';
import { therapyPromptEngine } from './therapyPromptEngine';
import { runBinauralMixPipeline } from './binauralMixService';

export interface GenerateTherapyTrackService {
  generate(request: TherapyRequest, apiKey: string): Promise<TherapyResponse>;
}

const audioProvider = new MultiProviderWithFallback([
  {
    name: 'replicate-musicgen',
    provider: new ReplicateMusicGenProvider(),
    priority: 1,
  },
  {
    name: 'openai-audio',
    provider: new DefaultAudioProvider(),
    priority: 2,
  },
]);

export const generateTherapyTrackService: GenerateTherapyTrackService = {
  async generate(request: TherapyRequest, apiKey: string): Promise<TherapyResponse> {
    // 1) Auth by API key
    const { user } = await apiKeyAuthService.authenticate(apiKey);
    apiKeyRateLimitService.check(apiKey);

    // 2) Quota check
    await usageService.checkAndConsumeDaily(user, user.plan);

    // 3) Resolve frequency target + session phases
    const frequency = frequencyMappingService.resolve(
      request.goal,
      request.emotion,
      request.bodyArea,
    );
    const phases = frequencyMappingService.resolveSessionPhases(frequency);

    // 4) Build therapy-aware prompt
    const { prompt } = therapyPromptEngine.buildPrompt(request, frequency);

    // 5) Call audio provider (generates base music)
    const smartTempo = frequencyMappingService.getSmartTempo(request.goal);
    const trackId = crypto.randomUUID();
    const providerResult = await audioProvider.generateTrack({
      prompt,
      tempo: smartTempo,
      lengthSeconds: request.durationSeconds,
    });

    // 6) Binaural mix pipeline → music + binaural beat + optional solfeggio + optional watermark → MP3/WAV
    const tempDir = os.tmpdir();
    const tempMp3Path = path.join(tempDir, `${trackId}.mp3`);
    const planInfo = planService.describePlan(user.plan, 0);
    const allowWav = planInfo.allowWav;
    const tempWavPath = allowWav ? path.join(tempDir, `${trackId}.wav`) : undefined;

    const watermarkPath = config.watermarkFilePath;
    const applyWatermark = user.plan === 'free' && !!watermarkPath;

    try {
      await runBinauralMixPipeline({
        musicPath: providerResult.tempFilePath,
        outputMp3Path: tempMp3Path,
        outputWavPath: tempWavPath,
        frequency,
        phases,
        durationSeconds: request.durationSeconds,
        applyWatermark,
        watermarkPath: applyWatermark ? watermarkPath : undefined,
        watermarkTailSeconds: 4,
      });

      // 7) Upload to storage
      const uploadResult = await supabaseStorageService.uploadTrack({
        userId: user.id,
        trackId,
        localFilePath: tempMp3Path,
        format: 'mp3',
      });

      let uploadResultWav: { storagePath: string } | undefined;
      if (allowWav && tempWavPath) {
        uploadResultWav = await supabaseStorageService.uploadTrack({
          userId: user.id,
          trackId,
          localFilePath: tempWavPath,
          format: 'wav',
        });
      }

      // 8) Save track metadata
      const intensity = request.intensity ?? 'medium';
      const track = await trackMetadataService.save({
        trackId,
        userId: user.id,
        plan: user.plan,
        request: {
          mood: request.goal.replace(/_/g, ' '),
          style: request.genre,
          tempo: smartTempo,
          length: request.durationSeconds,
          intensity,
        },
        provider: 'openai',
        providerVersion: providerResult.providerVersion ?? null,
        watermarked: applyWatermark,
        commercialLicense: planInfo.commercialLicense,
        storagePath: uploadResult.storagePath,
        wavStoragePath: uploadResultWav?.storagePath ?? null,
        durationSeconds: request.durationSeconds,
        format: 'mp3',
        trackType: 'therapy',
        therapyFrequency: {
          band: frequency.band,
          hz: frequency.hz,
          solfeggioHz: frequency.solfeggioHz,
          label: frequency.label,
        },
      });

      // 9) Trigger objective audio analysis in the background (non-blocking).
      // The Python audio-analysis microservice fetches the uploaded track,
      // computes BPM / spectral / therapy-fit metrics, and writes them back
      // to the tracks row. Failure is logged and persisted as
      // audio_analysis_status='failed' — user delivery is never blocked.
      audioAnalysisService.triggerInBackground({
        trackId: track.id,
        storagePath: track.storagePath,
        targetBpm: smartTempo,
        targetBrainwaveHz: frequency.hz,
      });

      const expiresInSeconds = 3600;

      // 10) Generate signed URL
      const downloadUrl = await supabaseStorageService.getDownloadUrl({
        storagePath: track.storagePath,
        expiresInSeconds,
      });

      let downloadUrlWav: string | undefined;
      if (allowWav && uploadResultWav) {
        downloadUrlWav = await supabaseStorageService.getDownloadUrl({
          storagePath: uploadResultWav.storagePath,
          expiresInSeconds,
        });
      }

      // 10) Build response
      const response: TherapyResponse = {
        id: track.id,
        status: 'completed',
        downloadUrl,
        format: 'mp3',
        expiresIn: expiresInSeconds,
        metadata: {
          goal: request.goal,
          genre: request.genre,
          bodyArea: request.bodyArea,
          emotion: request.emotion,
          duration: request.durationSeconds,
          intensity,
          frequency,
          culturalMode: request.culturalMode,
          provider: providerResult.providerVersion ?? 'openai',
          plan: track.plan,
          watermarked: applyWatermark,
          commercialLicense: planInfo.commercialLicense,
        },
        ...(allowWav && downloadUrlWav
          ? {
              downloadUrlWav,
              formatWav: 'wav',
            }
          : {}),
      };

      return response;
    } finally {
      // Cleanup temp files (best-effort)
      await fs.unlink(providerResult.tempFilePath).catch(() => {});
      await fs.unlink(tempMp3Path).catch(() => {});
      if (tempWavPath) {
        await fs.unlink(tempWavPath).catch(() => {});
      }
    }
  },
};
