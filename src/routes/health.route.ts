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
    } catch (err: any) {
      db.status = 'error';
      db.error = err?.message ?? 'Unknown error';
    }

    try {
      const { error } = await supabaseClient.storage.from('tracks').list('', { limit: 1 });
      if (error) {
        storage.status = 'error';
        storage.error = 'Supabase storage list failed';
      }
    } catch (err: any) {
      storage.status = 'error';
      storage.error = err?.message ?? 'Unknown error';
    }

    try {
      const endpoint = process.env.OPENAI_AUDIO_ENDPOINT;
      const fetchFn: any = (globalThis as any).fetch;
      if (!endpoint || !config.openAiApiKey || typeof fetchFn !== 'function') {
        provider.status = 'error';
        provider.error = 'Provider configuration or fetch missing';
      }
    } catch (err: any) {
      provider.status = 'error';
      provider.error = err?.message ?? 'Unknown error';
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
