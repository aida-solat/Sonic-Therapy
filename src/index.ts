import 'dotenv/config';
import { buildApp } from './app';

async function main(): Promise<void> {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void main();