import { FastifyRequest, FastifyReply } from 'fastify';

import { AppError } from '../types/errors';
import { apiKeyAuthService } from '../services/auth/apiKeyAuthService';
import { apiKeyManagementService } from '../services/auth/apiKeyManagementService';
import { CreateApiKeySchema } from '../schemas/keys.schema';

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

type CreateApiKeyRouteRequest = FastifyRequest<{ Body: { label?: string } }>;
type CreateApiKeyRouteReply = FastifyReply;

export function registerKeysRoute(app: any): void {
  app.post('/api/keys', { schema: CreateApiKeySchema }, async (request: CreateApiKeyRouteRequest, reply: CreateApiKeyRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const { user } = await apiKeyAuthService.authenticate(apiKey);

    const { label } = request.body;
    const result = await apiKeyManagementService.createKeyForUser(user.id, label ?? null);

    reply.send(result);
  });
}
