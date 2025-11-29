import { RateLimitExceededError } from '../../types/errors';

export interface ApiKeyRateLimitService {
  check(apiKey: string): void;
}

interface Counter {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;

const counters = new Map<string, Counter>();

export const apiKeyRateLimitService: ApiKeyRateLimitService = {
  check(apiKey: string): void {
    const now = Date.now();
    const current = counters.get(apiKey);

    if (!current || now - current.windowStart >= WINDOW_MS) {
      counters.set(apiKey, {
        windowStart: now,
        count: 1
      });
      return;
    }

    if (current.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new RateLimitExceededError();
    }

    current.count += 1;
  }
};
