import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { GenerateRequest, GenerateResponse } from '../../types/domain';
import { apiKeyAuthService } from '../auth/apiKeyAuthService';
import { usageService } from '../usage/usageService';
import { planService } from '../billing/planService';
import { promptEngine } from '../prompt/promptEngine';
import { DefaultAudioProvider } from '../../providers/audio/defaultAudioProvider';
import { runFfmpegPipeline } from '../../infra/ffmpeg';
import { supabaseStorageService } from '../storage/supabaseStorageService';

import { trackMetadataService } from './trackMetadataService';

export interface GenerateTrackService {
  generate(request: GenerateRequest, apiKey: string): Promise<GenerateResponse>;
}

const audioProvider = new DefaultAudioProvider();

export const generateTrackService: GenerateTrackService = {
  async generate(request: GenerateRequest, apiKey: string): Promise<GenerateResponse> {
    // 1) Auth by API key
    const { user } = await apiKeyAuthService.authenticate(apiKey);

    // 2) Quota check
    await usageService.checkAndConsumeDaily(user, user.plan);

    // 3) Build prompt
    const { prompt } = promptEngine.buildPrompt(request);

    // 4) Call audio provider
    const trackId = crypto.randomUUID();
    const providerResult = await audioProvider.generateTrack({
      prompt,
      tempo: request.tempo,
      lengthSeconds: request.length
    });

    // 5) ffmpeg pipeline → normalized + (optional) watermark + MP3
    const tempDir = os.tmpdir();
    const tempMp3Path = path.join(tempDir, `${trackId}.mp3`);
    const planInfo = planService.describePlan(user.plan, 0);

    const allowWav = planInfo.allowWav;
    const tempWavPath = allowWav ? path.join(tempDir, `${trackId}.wav`) : undefined;

    const watermarkPath = process.env.WATERMARK_FILE_PATH;
    const applyWatermark = user.plan === 'free' && !!watermarkPath;

    try {
      await runFfmpegPipeline({
        inputPath: providerResult.tempFilePath,
        outputMp3Path: tempMp3Path,
        outputWavPath: tempWavPath,
        applyWatermark,
        watermarkPath: applyWatermark ? watermarkPath : undefined,
        durationSeconds: request.length,
        watermarkTailSeconds: 4
      });

      // 6) Upload to storage
      const uploadResult = await supabaseStorageService.uploadTrack({
        userId: user.id,
        trackId,
        localFilePath: tempMp3Path,
        format: 'mp3'
      });

      let uploadResultWav: { storagePath: string } | undefined;
      if (allowWav && tempWavPath) {
        uploadResultWav = await supabaseStorageService.uploadTrack({
          userId: user.id,
          trackId,
          localFilePath: tempWavPath,
          format: 'wav'
        });
      }

      // 7) Save track metadata
      const track = await trackMetadataService.save({
        trackId,
        userId: user.id,
        plan: user.plan,
        request,
        provider: 'openai',
        providerVersion: providerResult.providerVersion ?? null,
        watermarked: applyWatermark,
        commercialLicense: planInfo.commercialLicense,
        storagePath: uploadResult.storagePath,
        durationSeconds: request.length,
        format: 'mp3'
      });

      const expiresInSeconds = 3600;

      // 8) Generate signed URL
      const downloadUrl = await supabaseStorageService.getDownloadUrl({
        storagePath: track.storagePath,
        expiresInSeconds
      });

      let downloadUrlWav: string | undefined;
      if (allowWav && uploadResultWav) {
        downloadUrlWav = await supabaseStorageService.getDownloadUrl({
          storagePath: uploadResultWav.storagePath,
          expiresInSeconds
        });
      }

      // 10) Build response
      const response: GenerateResponse = {
        id: track.id,
        status: 'completed',
        downloadUrl,
        format: 'mp3',
        expiresIn: expiresInSeconds,
        metadata: {
          tempo: track.tempo,
          mood: track.mood,
          duration: track.durationSeconds,
          style: track.style,
          intensity: track.intensity,
          provider: track.provider,
          plan: track.plan,
          watermarked: track.watermarked,
          commercialLicense: track.commercialLicense
        },
        ...(allowWav && downloadUrlWav
          ? {
              downloadUrlWav,
              formatWav: 'wav'
            }
          : {})
      };

      return response;
    } finally {
      // 9) Cleanup temp files (best-effort)
      await fs.unlink(providerResult.tempFilePath).catch(() => {});
      await fs.unlink(tempMp3Path).catch(() => {});
      if (tempWavPath) {
        await fs.unlink(tempWavPath).catch(() => {});
      }
    }
  }
};
