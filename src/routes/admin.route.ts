import { FastifyReply, FastifyRequest } from 'fastify';

import { config } from '../config/env';
import { AdminRetryAnalysesSchema } from '../schemas/admin.schema';
import { retryFailedAnalysesService } from '../services/audioAnalysis/retryFailedAnalysesService';
import { AppError } from '../types/errors';

interface RetryAnalysesBody {
  limit?: number;
  minAgeSeconds?: number;
  statuses?: Array<'failed' | 'pending'>;
}

/**
 * Constant-time string comparison to avoid timing attacks on the admin key.
 */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function requireAdminKey(request: FastifyRequest): void {
  const expected = config.adminApiKey;
  if (!expected) {
    throw new AppError(
      'Admin endpoints are disabled on this deployment (ADMIN_API_KEY not set).',
      'admin_disabled',
      503,
    );
  }

  const headers = request.headers as Record<string, string | string[] | undefined>;
  const rawHeader = headers['x-admin-key'];
  const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!provided || !safeEquals(provided, expected)) {
    throw new AppError('Invalid or missing admin credentials.', 'unauthorized', 401);
  }
}

export function registerAdminRoute(app: any): void {
  app.post(
    '/api/admin/retry-failed-analyses',
    { schema: AdminRetryAnalysesSchema },
    async (
      request: FastifyRequest<{ Body: RetryAnalysesBody }>,
      reply: FastifyReply,
    ) => {
      requireAdminKey(request);

      const body = request.body ?? {};
      const report = await retryFailedAnalysesService.run({
        limit: body.limit,
        minAgeSeconds: body.minAgeSeconds,
        statuses: body.statuses,
      });

      reply.send(report);
    },
  );
}
