import { FastifyRequest, FastifyReply } from 'fastify';

import { GenerateRequest, GenerateResponse } from '../types/domain';
import { GenerateSchema } from '../schemas/generate.schema';
import { generateTrackService } from '../services/tracks/generateTrackService';
import { extractApiKey } from '../utils/extractApiKey';

type GenerateRouteRequest = FastifyRequest<{ Body: GenerateRequest }>;
type GenerateRouteReply = FastifyReply;

export function registerGenerateRoute(app: any): void {
  app.post('/api/generate', { schema: GenerateSchema }, async (request: GenerateRouteRequest, reply: GenerateRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const response = await generateTrackService.generate(request.body, apiKey);
    reply.send(response);
  });
}
