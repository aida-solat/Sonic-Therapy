import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, resetDatabase, createTestUserWithApiKey } from '../helpers/testUtils';
import { supabaseClient } from '../../src/infra/supabaseClient';
import { supabaseStorageService } from '../../src/services/storage/supabaseStorageService';

vi.mock('../../src/providers/audio/defaultAudioProvider', () => {
  return {
    DefaultAudioProvider: class {
      async generateTrack(): Promise<{ tempFilePath: string; format: 'wav' }> {
        // Return a fake temp file path; generateTrackService will attempt to
        // run ffmpeg and then unlink this path, but we mock ffmpeg so no real IO happens.
        return {
          tempFilePath: '/tmp/fake-input.wav',
          format: 'wav'
        };
      }
    }
  };
});

vi.mock('../../src/infra/ffmpeg', () => {
  return {
    runFfmpegPipeline: vi.fn(async () => {
      // no-op for tests
    })
  };
});

vi.mock('../../src/services/storage/supabaseStorageService', () => {
  return {
    supabaseStorageService: {
      uploadTrack: vi.fn(async (params: any) => {
        const { userId, trackId, format } = params;
        return {
          storagePath: `tracks/${userId}/${trackId}.${format}`,
          contentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
        };
      }),
      getDownloadUrl: vi.fn(async (params: any) => {
        return `https://example.com/${params.storagePath}`;
      })
    }
  };
});

function getTodayDateUtc(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('POST /api/generate', () => {
  let app: FastifyInstance;
  let userId: string;
  let apiKey: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
    const result = await createTestUserWithApiKey('pro');
    userId = result.userId;
    apiKey = result.apiKey;
    vi.clearAllMocks();
  });

  it('generates a track, stores metadata, and updates usage for the authenticated user', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60,
      intensity: 'soft' as const
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;

    // Basic response shape
    expect(body).toHaveProperty('id');
    expect(body.status).toBe('completed');
    expect(body.format).toBe('mp3');
    expect(typeof body.downloadUrl).toBe('string');
    expect(body.metadata.mood).toBe(payload.mood);
    expect(body.metadata.style).toBe(payload.style);
    expect(body.metadata.tempo).toBe(payload.tempo);
    expect(body.metadata.duration).toBe(payload.length);
    expect(body.metadata.plan).toBe('pro');
    expect(body.metadata.watermarked).toBe(false);

    // Storage mocks were called
    expect(supabaseStorageService.uploadTrack).toHaveBeenCalledTimes(2);
    expect(supabaseStorageService.getDownloadUrl).toHaveBeenCalledTimes(2);

    // Track metadata persisted in DB
    const { data: tracks, error: tracksError } = await supabaseClient
      .from('tracks')
      .select('*')
      .eq('user_id', userId);

    expect(tracksError).toBeNull();
    expect(tracks).not.toBeNull();
    expect((tracks ?? []).length).toBe(1);
    const track = (tracks ?? [])[0] as any;
    expect(track.mood).toBe(payload.mood);
    expect(track.style).toBe(payload.style);
    expect(track.tempo).toBe(payload.tempo);
    expect(track.length).toBe(payload.length);
    expect(track.plan).toBe('pro');

    // Usage updated in DB (one request consumed for today)
    const today = getTodayDateUtc();

    const { data: usageRows, error: usageError } = await supabaseClient
      .from('usage_daily')
      .select('requests_count')
      .eq('user_id', userId)
      .eq('date', today);

    expect(usageError).toBeNull();
    const usage = usageRows && usageRows[0];
    expect(usage?.requests_count).toBe(1);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('missing_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when Authorization header is invalid', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: 'Basic invalid'
      },
      payload
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when API key is invalid', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: 'Bearer invalid-api-key'
      },
      payload
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_api_key');
    expect(body.error.status).toBe(401);
  });

  it('returns 429 when daily quota is exceeded for the user', async () => {
    const today = getTodayDateUtc();

    const { error } = await supabaseClient
      .from('usage_daily')
      .insert({
        user_id: userId,
        date: today,
        requests_count: 20
      });

    expect(error).toBeNull();

    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(response.statusCode).toBe(429);
    const body = response.json() as any;
    expect(body.error.code).toBe('quota_exceeded');
    expect(body.error.status).toBe(429);
  });

  it('returns 400 validation_error when request body is invalid', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 40, // below minimum 50
      length: 60
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.error.code).toBe('validation_error');
    expect(body.error.status).toBe(400);
  });

  it('returns 500 internal_error when storage upload fails', async () => {
    const payload = {
      mood: 'calm',
      style: 'ambient',
      tempo: 80,
      length: 60
    };

    const uploadMock = vi.mocked(supabaseStorageService.uploadTrack);
    uploadMock.mockRejectedValueOnce(new Error('upload failed'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload
    });

    expect(response.statusCode).toBe(500);
    const body = response.json() as any;
    expect(body.error.code).toBe('internal_error');
    expect(body.error.status).toBe(500);
  });
});
