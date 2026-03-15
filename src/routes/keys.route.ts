import { FastifyRequest, FastifyReply } from 'fastify';

import { apiKeyAuthService } from '../services/auth/apiKeyAuthService';
import { apiKeyRateLimitService } from '../services/auth/apiKeyRateLimitService';
import { apiKeyManagementService } from '../services/auth/apiKeyManagementService';
import { CreateApiKeySchema } from '../schemas/keys.schema';
import { extractApiKey } from '../utils/extractApiKey';

type CreateApiKeyRouteRequest = FastifyRequest<{ Body: { label?: string } }>;
type CreateApiKeyRouteReply = FastifyReply;

export function registerKeysRoute(app: any): void {
  app.post('/api/keys', { schema: CreateApiKeySchema }, async (request: CreateApiKeyRouteRequest, reply: CreateApiKeyRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const { user } = await apiKeyAuthService.authenticate(apiKey);

    apiKeyRateLimitService.check(apiKey);

    const { label } = request.body;
    const result = await apiKeyManagementService.createKeyForUser(user.id, label ?? null);

    reply.send(result);
  });
}
