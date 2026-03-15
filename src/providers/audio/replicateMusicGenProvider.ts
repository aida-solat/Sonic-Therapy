import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import Replicate from 'replicate';

import { AppError } from '../../types/errors';
import { logger } from '../../infra/logger';

import {
  AudioProvider,
  AudioProviderGenerateParams,
  AudioProviderGenerateResult,
} from './audioProvider';

const MUSICGEN_MODEL =
  'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb';

export class ReplicateMusicGenProvider implements AudioProvider {
  private readonly replicate: Replicate;

  constructor() {
    this.replicate = new Replicate();
  }

  async generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult> {
    let output: any;

    try {
      output = await this.replicate.run(MUSICGEN_MODEL, {
        input: {
          model_version: 'stereo-melody-large',
          prompt: params.prompt,
          duration: Math.min(params.lengthSeconds, 120),
          output_format: 'wav',
          normalization_strategy: 'loudness',
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Replicate MusicGen request failed');
      throw new AppError('Failed to generate music via Replicate', 'provider_error', 500);
    }

    // output is a URL string or ReadableStream
    const audioUrl = typeof output === 'string' ? output : String(output);

    if (!audioUrl || !audioUrl.startsWith('http')) {
      logger.error({ output: typeof output }, 'Unexpected Replicate output format');
      throw new AppError(
        'Unexpected response from music generation provider',
        'provider_error',
        500,
      );
    }

    // Download the generated audio file
    let response: Response;
    try {
      response = await fetch(audioUrl);
    } catch (error) {
      logger.error({ err: error }, 'Failed to download generated audio from Replicate');
      throw new AppError('Failed to download generated audio', 'provider_error', 500);
    }

    if (!response.ok) {
      throw new AppError(
        `Failed to download generated audio: HTTP ${response.status}`,
        'provider_error',
        500,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `musicgen-${Date.now()}.wav`);
    await fs.writeFile(tempFilePath, buffer);

    return {
      tempFilePath,
      format: 'wav',
      providerVersion: 'musicgen-stereo-melody-large',
    };
  }
}
