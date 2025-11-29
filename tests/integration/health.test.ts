import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp } from '../helpers/testUtils';

describe('GET /healthz', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    if (!process.env.OPENAI_AUDIO_ENDPOINT) {
      process.env.OPENAI_AUDIO_ENDPOINT = 'https://example.com/healthz';
    }

    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns overall health with dependency statuses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;

    expect(body.status === 'ok' || body.status === 'error').toBe(true);
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('storage');
    expect(body).toHaveProperty('provider');
  });
});
