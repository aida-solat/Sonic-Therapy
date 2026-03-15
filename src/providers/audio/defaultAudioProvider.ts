import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { config as appConfig } from '../../config/env';
import { AppError } from '../../types/errors';
import { logger } from '../../infra/logger';

import {
  AudioProvider,
  AudioProviderGenerateParams,
  AudioProviderGenerateResult,
} from './audioProvider';

export interface DefaultAudioProviderConfig {
  model: string;
  parameters?: Record<string, unknown>;
  providerVersion?: string | null;
}

export class DefaultAudioProvider implements AudioProvider {
  private readonly config: DefaultAudioProviderConfig;

  constructor(providerConfig?: DefaultAudioProviderConfig) {
    if (providerConfig) {
      this.config = {
        ...providerConfig,
        providerVersion: providerConfig.providerVersion ?? providerConfig.model,
      };
    } else {
      const model = appConfig.openAiAudioModel;
      this.config = {
        model,
        parameters: undefined,
        providerVersion: model,
      };
    }
  }

  async generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult> {
    const endpoint = appConfig.openAiAudioEndpoint;
    if (!endpoint) {
      logger.error('OPENAI_AUDIO_ENDPOINT is not configured');
      throw new AppError('OPENAI_AUDIO_ENDPOINT is not configured', 'provider_error', 500);
    }

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      logger.error('fetch is not available in this runtime');
      throw new AppError('fetch is not available in this runtime', 'provider_error', 500);
    }

    let response: any;
    try {
      response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appConfig.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          input: params.prompt,
          voice: 'alloy',
          response_format: 'wav',
          ...(this.config.parameters ?? {}),
        }),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to call audio provider');
      throw new AppError('Failed to call audio provider', 'provider_error', 500);
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 'unknown';
      logger.error({ status }, 'Audio provider request failed with non-OK status');
      throw new AppError(
        `Audio provider request failed with status ${status}`,
        'provider_error',
        500,
      );
    }

    const contentType =
      typeof response.headers?.get === 'function'
        ? (response.headers.get('content-type') ?? '')
        : '';

    let format: 'wav' | 'mp3' = 'wav';
    let extension = 'wav';

    if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) {
      format = 'mp3';
      extension = 'mp3';
    } else if (
      contentType.includes('audio/wav') ||
      contentType.includes('audio/x-wav') ||
      contentType.includes('audio/wave')
    ) {
      format = 'wav';
      extension = 'wav';
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `openai-audio-${Date.now()}.${extension}`);

    await fs.writeFile(tempFilePath, buffer as any);

    return {
      tempFilePath,
      format,
      providerVersion: this.config.providerVersion ?? null,
    };
  }
}
