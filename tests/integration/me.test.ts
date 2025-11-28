import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, resetDatabase, createTestUserWithApiKey } from '../helpers/testUtils';
import { planService } from '../../src/services/billing/planService';
import { supabaseClient } from '../../src/infra/supabaseClient';

describe('GET /api/me', () => {
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
  });

  it('returns current user plan and quota information', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: `Bearer ${apiKey}`
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;

    expect(body).toHaveProperty('userId');
    expect(body.plan).toBe('pro');

    const planInfo = planService.describePlan('pro', 0);

    expect(body.dailyQuota).toBe(planInfo.dailyQuota);
    expect(body.usedToday).toBe(0);
    expect(body.remainingToday).toBe(planInfo.dailyQuota);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/me'
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('missing_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when Authorization header is invalid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: 'Basic invalid'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_authorization_header');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 when API key is invalid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: 'Bearer invalid-api-key'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_api_key');
    expect(body.error.status).toBe(401);
  });

  it('returns 401 invalid_api_key when user linked to API key no longer exists', async () => {
    const { error } = await supabaseClient
      .from('app_users')
      .delete()
      .eq('id', userId);

    expect(error).toBeNull();

    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        authorization: `Bearer ${apiKey}`
      }
    });

    expect(response.statusCode).toBe(401);
    const body = response.json() as any;
    expect(body.error.code).toBe('invalid_api_key');
    expect(body.error.status).toBe(401);
  });
});
