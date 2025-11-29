import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';

import { loggerOptions } from './infra/logger';
import { registerHealthRoute } from './routes/health.route';
import { registerGenerateRoute } from './routes/generate.route';
import { registerKeysRoute } from './routes/keys.route';
import { registerMeRoute } from './routes/me.route';
import { registerStripeWebhookRoute } from './routes/stripeWebhook.route';
import { AppError, ErrorResponse } from './types/errors';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: loggerOptions
  });

  app.register(cors);
  app.register(formbody);

  app.setErrorHandler((error: any, request: any, reply: any) => {
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

    app.log.error(
      {
        err: error,
        url: request.raw.url,
        method: request.raw.method,
        status,
        code
      },
      'Request failed'
    );

    void reply.status(status).send(payload);
  });

  registerHealthRoute(app);
  registerGenerateRoute(app);
  registerKeysRoute(app);
  registerMeRoute(app);
  registerStripeWebhookRoute(app);

  return app;
}
