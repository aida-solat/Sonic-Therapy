import fastify, { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';

import { registerHealthRoute } from './routes/health.route';
import { registerGenerateRoute } from './routes/generate.route';
import { registerKeysRoute } from './routes/keys.route';
import { registerMeRoute } from './routes/me.route';
import { registerStripeWebhookRoute } from './routes/stripeWebhook.route';
import { AppError, ErrorResponse } from './types/errors';

export function buildApp(): FastifyInstance {
  const app = fastify();

  app.register(cors);
  app.register(formbody);

  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    let status: number;
    let code: string;
    let message: string;

    if (error instanceof AppError) {
      status = error.statusCode;
      code = error.code;
      message = error.message;
    } else if ((error as any).validation) {
      status = (error.statusCode as number) || 400;
      code = 'validation_error';
      message = error.message;
    } else {
      status = (error.statusCode as number) || 500;
      code = status >= 500 ? 'internal_error' : 'unknown_error';
      message = status >= 500 ? 'Internal server error' : error.message;
    }

    const payload: ErrorResponse = {
      error: {
        code,
        message,
        status
      }
    };

    void reply.status(status).send(payload);
  });

  registerHealthRoute(app);
  registerGenerateRoute(app);
  registerKeysRoute(app);
  registerMeRoute(app);
  registerStripeWebhookRoute(app);

  return app;
}
