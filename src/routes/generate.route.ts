import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { GenerateRequest, GenerateResponse } from '../types/domain';
import { AppError } from '../types/errors';
import { GenerateSchema } from '../schemas/generate.schema';
import { generateTrackService } from '../services/tracks/generateTrackService';

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

type GenerateRouteRequest = FastifyRequest<{ Body: GenerateRequest }>;
type GenerateRouteReply = FastifyReply;

export function registerGenerateRoute(app: FastifyInstance): void {
  app.post<{ Body: GenerateRequest; Reply: GenerateResponse }>('/api/generate', { schema: GenerateSchema }, async (request: GenerateRouteRequest, reply: GenerateRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const response = await generateTrackService.generate(request.body, apiKey);
    reply.send(response);
  });
}
