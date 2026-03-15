import { FastifyRequest, FastifyReply } from 'fastify';

import { TherapyRequest } from '../types/domain';
import { TherapySchema } from '../schemas/therapy.schema';
import { generateTherapyTrackService } from '../services/therapy/generateTherapyTrackService';
import { extractApiKey } from '../utils/extractApiKey';

type TherapyRouteRequest = FastifyRequest<{ Body: TherapyRequest }>;
type TherapyRouteReply = FastifyReply;

export function registerTherapyRoute(app: any): void {
  app.post('/api/generate/therapy', { schema: TherapySchema }, async (request: TherapyRouteRequest, reply: TherapyRouteReply) => {
    const apiKey = extractApiKey(request.headers as Record<string, any>);
    const response = await generateTherapyTrackService.generate(request.body, apiKey);
    reply.send(response);
  });
}
