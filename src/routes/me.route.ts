import { FastifyRequest, FastifyReply } from 'fastify';

import { apiKeyAuthService } from '../services/auth/apiKeyAuthService';
import { apiKeyRateLimitService } from '../services/auth/apiKeyRateLimitService';
import { usageService } from '../services/usage/usageService';
import { planService } from '../services/billing/planService';
import { MeSchema } from '../schemas/me.schema';
import { extractApiKey } from '../utils/extractApiKey';

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
