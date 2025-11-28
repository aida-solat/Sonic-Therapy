import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, resetDatabase, createTestUserWithApiKey } from '../helpers/testUtils';
import { supabaseClient } from '../../src/infra/supabaseClient';
import { apiKeyManagementService } from '../../src/services/auth/apiKeyManagementService';

describe('POST /api/keys', () => {
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
    const result = await createTestUserWithApiKey('free');
    userId = result.userId;
    apiKey = result.apiKey;
  });

  it('creates a new API key for authenticated user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keys',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload: {
        label: 'second-key'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;

    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('apiKey');
    expect(body.label).toBe('second-key');

    const { data, error } = await supabaseClient
      .from('api_keys')
      .select('id')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // 1 key از helper + 1 key از endpoint
    expect((data ?? []).length).toBe(2);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keys',
      payload: {
        label: 'test-missing-auth'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('missing_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when Authorization header is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keys',
      headers: {
        authorization: 'Basic invalid'
      },
      payload: {
        label: 'test-invalid-auth'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when API key is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keys',
      headers: {
        authorization: 'Bearer invalid-api-key'
      },
      payload: {
        label: 'test-invalid-key'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_api_key');
    expect(body.error.status).toBe(401);
  });

  it('returns 500 internal_error when API key creation fails in the database', async () => {
    const spy = vi
      .spyOn(apiKeyManagementService, 'createKeyForUser')
      .mockRejectedValueOnce(new Error('db failure'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/keys',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      payload: {
        label: 'test-db-error'
      }
    });

    spy.mockRestore();

    expect(response.statusCode).toBe(500);
    const body = response.json() as any;
    expect(body.error.code).toBe('internal_error');
    expect(body.error.status).toBe(500);
  });
});
