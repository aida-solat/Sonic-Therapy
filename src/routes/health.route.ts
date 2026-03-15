import { supabaseClient } from '../infra/supabaseClient';
import { config } from '../config/env';

export function registerHealthRoute(app: any): void {
  app.get('/healthz', async (_request: any, reply: any) => {
    const db: { status: string; error?: string } = { status: 'ok' };
    const storage: { status: string; error?: string } = { status: 'ok' };
    const provider: { status: string; error?: string } = { status: 'ok' };

    try {
      const { error } = await supabaseClient.from('app_users').select('id').limit(1);
      if (error) {
        db.status = 'error';
        db.error = 'Supabase query failed';
      }
    } catch {
      db.status = 'error';
      db.error = 'Database check failed';
    }

    try {
      const { error } = await supabaseClient.storage.from('tracks').list('', { limit: 1 });
      if (error) {
        storage.status = 'error';
        storage.error = 'Storage check failed';
      }
    } catch {
      storage.status = 'error';
      storage.error = 'Storage check failed';
    }

    try {
      const fetchFn: any = (globalThis as any).fetch;
      if (!config.openAiAudioEndpoint || !config.openAiApiKey || typeof fetchFn !== 'function') {
        provider.status = 'error';
        provider.error = 'Provider not configured';
      }
    } catch {
      provider.status = 'error';
      provider.error = 'Provider check failed';
    }

    const overallStatus = db.status === 'ok' && storage.status === 'ok' && provider.status === 'ok' ? 'ok' : 'error';

    return reply.code(200).send({
      status: overallStatus,
      db,
      storage,
      provider
    });
  });
}
