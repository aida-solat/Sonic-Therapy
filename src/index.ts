import 'dotenv/config';
import { buildApp } from './app';
import { logger } from './infra/logger';

async function main(): Promise<void> {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    logger.info({ port, host }, 'Server listening');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

void main();