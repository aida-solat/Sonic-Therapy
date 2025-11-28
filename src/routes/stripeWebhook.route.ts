import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { stripeWebhookService } from '../services/billing/stripeWebhookService';
import { StripeWebhookSchema } from '../schemas/stripeWebhook.schema';

export function registerStripeWebhookRoute(app: FastifyInstance): void {
  app.post('/webhooks/stripe', { config: { rawBody: true }, schema: StripeWebhookSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = (request as any).rawBody ?? request.body;
    const signature = request.headers['stripe-signature'];

    await stripeWebhookService.handleEvent(rawBody, signature as string | string[] | undefined);

    reply.code(200).send({ received: true });
  });
}
