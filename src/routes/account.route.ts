import { FastifyReply, FastifyRequest } from 'fastify';

import { extractBearerToken } from '../utils/extractBearerToken';
import { userSessionAuthService } from '../services/auth/userSessionAuthService';
import { usageService } from '../services/usage/usageService';
import { planService } from '../services/billing/planService';
import { apiKeyManagementService } from '../services/auth/apiKeyManagementService';
import { supabaseClient } from '../infra/supabaseClient';
import { listTracksService } from '../services/tracks/listTracksService';
import { stripeBillingService } from '../services/billing/stripeBillingService';
import { evaluationService } from '../services/evaluation/evaluationService';
import { AppError } from '../types/errors';
import {
  AccountBillingCheckoutSchema,
  AccountBillingPortalSchema,
  AccountCreateKeySchema,
  AccountDeleteKeySchema,
  AccountKeysListSchema,
  AccountMeSchema,
  AccountTracksSchema,
  AccountTrackRateSchema,
  AccountTrackEvaluationSchema,
} from '../schemas/account.schema';

export function registerAccountRoute(app: any): void {
  app.get(
    '/api/account/me',
    { schema: AccountMeSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);
      const usage = await usageService.getTodayUsage(user.id);
      const dailyQuota = planService.getDailyQuota(user.plan);

      reply.send({
        userId: user.id,
        email: user.email,
        plan: user.plan,
        dailyQuota,
        usedToday: usage.requestsCount,
        remainingToday: Math.max(dailyQuota - usage.requestsCount, 0),
        stripeCustomerId: user.stripeCustomerId ?? null,
        hasBillingCustomer: Boolean(user.stripeCustomerId),
      });
    },
  );

  app.get(
    '/api/account/keys',
    { schema: AccountKeysListSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);

      const { data, error } = await supabaseClient
        .from('api_keys')
        .select('id, label, status, last_used_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to load API keys', 'db_error', 500);
      }

      reply.send({
        items: (data ?? []).map((item) => ({
          id: item.id,
          label: item.label ?? null,
          status: item.status,
          lastUsedAt: item.last_used_at ?? null,
          createdAt: item.created_at,
        })),
      });
    },
  );

  app.post(
    '/api/account/keys',
    { schema: AccountCreateKeySchema },
    async (request: FastifyRequest<{ Body: { label?: string } }>, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);
      const result = await apiKeyManagementService.createKeyForUser(
        user.id,
        request.body?.label ?? null,
      );

      reply.send(result);
    },
  );

  app.delete(
    '/api/account/keys/:keyId',
    { schema: AccountDeleteKeySchema },
    async (request: FastifyRequest<{ Params: { keyId: string } }>, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);

      const { error } = await supabaseClient
        .from('api_keys')
        .delete()
        .eq('id', request.params.keyId)
        .eq('user_id', user.id);

      if (error) {
        throw new AppError('Failed to delete API key', 'db_error', 500);
      }

      reply.send({ success: true });
    },
  );

  app.get(
    '/api/account/tracks',
    { schema: AccountTracksSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);
      const items = await listTracksService.listForUser(user.id);

      reply.send({ items });
    },
  );

  /* ── Track Rating ── */

  app.post(
    '/api/account/tracks/:trackId/rate',
    { schema: AccountTrackRateSchema },
    async (
      request: FastifyRequest<{
        Params: { trackId: string };
        Body: {
          satisfaction: number;
          moodAccuracy: number;
          styleAccuracy: number;
          audioQuality: number;
          comment?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);

      await evaluationService.rateTrack({
        trackId: request.params.trackId,
        userId: user.id,
        satisfaction: request.body.satisfaction,
        moodAccuracy: request.body.moodAccuracy,
        styleAccuracy: request.body.styleAccuracy,
        audioQuality: request.body.audioQuality,
        comment: request.body.comment ?? null,
      });

      reply.send({ success: true });
    },
  );

  app.get(
    '/api/account/tracks/:trackId/evaluation',
    { schema: AccountTrackEvaluationSchema },
    async (request: FastifyRequest<{ Params: { trackId: string } }>, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      await userSessionAuthService.authenticate(accessToken);

      const evaluation = await evaluationService.getTrackEvaluation(request.params.trackId);

      if (!evaluation) {
        throw new AppError('No ratings found for this track', 'not_found', 404);
      }

      reply.send(evaluation);
    },
  );

  app.post(
    '/api/account/billing/checkout-session',
    { schema: AccountBillingCheckoutSchema },
    async (
      request: FastifyRequest<{
        Body: { plan: 'basic' | 'pro' | 'ultra'; successUrl: string; cancelUrl: string };
      }>,
      reply: FastifyReply,
    ) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);
      const result = await stripeBillingService.createCheckoutSession({
        user,
        plan: request.body.plan,
        successUrl: request.body.successUrl,
        cancelUrl: request.body.cancelUrl,
      });

      reply.send(result);
    },
  );

  app.post(
    '/api/account/billing/portal-session',
    { schema: AccountBillingPortalSchema },
    async (request: FastifyRequest<{ Body: { returnUrl: string } }>, reply: FastifyReply) => {
      const accessToken = extractBearerToken(request.headers as Record<string, any>);
      const { user } = await userSessionAuthService.authenticate(accessToken);
      const result = await stripeBillingService.createPortalSession({
        user,
        returnUrl: request.body.returnUrl,
      });

      reply.send(result);
    },
  );
}
