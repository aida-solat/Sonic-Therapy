import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { config } from '../../config/env';

import { AudioProvider, AudioProviderGenerateParams, AudioProviderGenerateResult } from './audioProvider';

export class DefaultAudioProvider implements AudioProvider {
  async generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult> {
    const endpoint = process.env.OPENAI_AUDIO_ENDPOINT;
    if (!endpoint) {
      throw new Error('OPENAI_AUDIO_ENDPOINT is not configured');
    }

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      throw new Error('fetch is not available in this runtime');
    }

    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: params.prompt,
        tempo: params.tempo,
        length_seconds: params.lengthSeconds
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI audio request failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `openai-audio-${Date.now()}.wav`);

    await fs.writeFile(tempFilePath, buffer as any);

    return {
      tempFilePath,
      format: 'wav'
    };
  }
}
