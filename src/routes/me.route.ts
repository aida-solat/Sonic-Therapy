import { FastifyRequest, FastifyReply } from 'fastify';

import { AppError } from '../types/errors';
import { apiKeyAuthService } from '../services/auth/apiKeyAuthService';
import { apiKeyRateLimitService } from '../services/auth/apiKeyRateLimitService';
import { usageService } from '../services/usage/usageService';
import { planService } from '../services/billing/planService';
import { MeSchema } from '../schemas/me.schema';

function extractApiKey(headers: Record<string, any>): string {
  const header = headers['authorization'] || headers['Authorization'];
  if (!header || typeof header !== 'string') {
    throw new AppError('Missing Authorization header', 'missing_authorization_header', 401);
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid Authorization header', 'invalid_authorization_header', 401);
  }
  return token;
}

type MeRouteRequest = FastifyRequest;
type MeRouteReply = FastifyReply;

export function registerMeRoute(app: any): void {
  app.get('/api/me', { schema: MeSchema }, async (request: MeRouteRequest, reply: MeRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const { user } = await apiKeyAuthService.authenticate(apiKey);

    apiKeyRateLimitService.check(apiKey);

    const usage = await usageService.getTodayUsage(user.id);
    const dailyQuota = planService.getDailyQuota(user.plan);
    const usedToday = usage.requestsCount;
    const remainingToday = Math.max(dailyQuota - usedToday, 0);

    reply.send({
      userId: user.id,
      plan: user.plan,
      dailyQuota,
      usedToday,
      remainingToday
    });
  });
}
