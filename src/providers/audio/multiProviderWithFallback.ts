import { logger } from '../../infra/logger';
import { AppError } from '../../types/errors';

import {
  AudioProvider,
  AudioProviderGenerateParams,
  AudioProviderGenerateResult,
} from './audioProvider';

export interface ProviderEntry {
  name: string;
  provider: AudioProvider;
  priority: number;
}

/**
 * Multi-provider orchestrator with automatic fallback.
 *
 * Providers are tried in priority order (lowest number = highest priority).
 * If one fails, the next is attempted. Latency and success/failure are logged
 * for each attempt to support benchmarking and evaluation.
 */
export class MultiProviderWithFallback implements AudioProvider {
  private readonly providers: ProviderEntry[];

  constructor(providers: ProviderEntry[]) {
    this.providers = [...providers].sort((a, b) => a.priority - b.priority);

    if (this.providers.length === 0) {
      throw new Error('MultiProviderWithFallback requires at least one provider');
    }
  }

  async generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult> {
    const errors: { name: string; error: unknown; latencyMs: number }[] = [];

    for (const entry of this.providers) {
      const start = Date.now();
      try {
        logger.info(
          { provider: entry.name, prompt: params.prompt.slice(0, 80) },
          `Attempting generation with provider: ${entry.name}`,
        );

        const result = await entry.provider.generateTrack(params);
        const latencyMs = Date.now() - start;

        logger.info(
          {
            provider: entry.name,
            latencyMs,
            format: result.format,
            providerVersion: result.providerVersion,
          },
          `Provider ${entry.name} succeeded in ${latencyMs}ms`,
        );

        return {
          ...result,
          providerVersion: result.providerVersion ?? entry.name,
        };
      } catch (error) {
        const latencyMs = Date.now() - start;
        errors.push({ name: entry.name, error, latencyMs });

        logger.warn(
          {
            provider: entry.name,
            latencyMs,
            err: error instanceof Error ? error.message : String(error),
          },
          `Provider ${entry.name} failed after ${latencyMs}ms, trying next...`,
        );
      }
    }

    // All providers failed
    const summary = errors
      .map((e) => `${e.name} (${e.latencyMs}ms): ${e.error instanceof Error ? e.error.message : String(e.error)}`)
      .join('; ');

    logger.error({ errors: errors.length, summary }, 'All audio providers failed');

    throw new AppError(
      `All audio providers failed: ${summary}`,
      'provider_error',
      500,
    );
  }

  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}
