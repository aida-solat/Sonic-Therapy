import crypto from 'crypto';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';
import { supabaseClient } from '../../src/infra/supabaseClient';
import { apiKeyManagementService } from '../../src/services/auth/apiKeyManagementService';
import type { PlanType } from '../../src/types/domain';

async function waitForAssertion(assertion: () => Promise<void>, timeoutMs = 15000, intervalMs = 200): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw lastError;
}

export async function resetDatabase(): Promise<void> {
  // Use a safe WHERE clause per table so Supabase/PostgREST allows DELETE,
  // and avoid casting problems with uuid columns.
  // We rely on known schema from implementation-blueprint.md.

  // tracks: id is uuid
  {
    const { error } = await supabaseClient
      .from('tracks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error && (error as any).code !== 'PGRST205') {
      // PGRST205 = table not in schema cache; ignore if table doesn't exist in this env
      throw error;
    }
  }

  // usage_daily: id is bigserial, so use a numeric filter to satisfy WHERE requirement
  {
    const { error } = await supabaseClient
      .from('usage_daily')
      .delete()
      .gt('id', 0);

    if (error && (error as any).code !== 'PGRST205') {
      throw error;
    }
  }

  // api_keys: id is uuid
  {
    const { error } = await supabaseClient
      .from('api_keys')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error && (error as any).code !== 'PGRST205') {
      throw error;
    }
  }

  // stripe_webhook_events: id is bigserial, so use a numeric filter as well
  {
    const { error } = await supabaseClient
      .from('stripe_webhook_events')
      .delete()
      .gt('id', 0);

    if (error && (error as any).code !== 'PGRST205') {
      throw error;
    }
  }

  // app_users: id is uuid
  {
    const { error } = await supabaseClient
      .from('app_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error && (error as any).code !== 'PGRST205') {
      throw error;
    }
  }

  await waitForAssertion(async () => {
    const [{ data: tracks, error: tracksError }, { data: usage, error: usageError }, { data: apiKeys, error: apiKeysError }, { data: events, error: eventsError }, { data: users, error: usersError }] = await Promise.all([
      supabaseClient.from('tracks').select('id').limit(1),
      supabaseClient.from('usage_daily').select('id').limit(1),
      supabaseClient.from('api_keys').select('id').limit(1),
      supabaseClient.from('stripe_webhook_events').select('id').limit(1),
      supabaseClient.from('app_users').select('id').limit(1)
    ]);

    if (tracksError && (tracksError as any).code !== 'PGRST205') throw tracksError;
    if (usageError && (usageError as any).code !== 'PGRST205') throw usageError;
    if (apiKeysError && (apiKeysError as any).code !== 'PGRST205') throw apiKeysError;
    if (eventsError && (eventsError as any).code !== 'PGRST205') throw eventsError;
    if (usersError && (usersError as any).code !== 'PGRST205') throw usersError;

    if ((tracks ?? []).length > 0) throw new Error('tracks not cleared');
    if ((usage ?? []).length > 0) throw new Error('usage_daily not cleared');
    if ((apiKeys ?? []).length > 0) throw new Error('api_keys not cleared');
    if ((events ?? []).length > 0) throw new Error('stripe_webhook_events not cleared');
    if ((users ?? []).length > 0) throw new Error('app_users not cleared');
  });
}

export async function createTestUserWithApiKey(plan: PlanType): Promise<{ userId: string; apiKey: string }> {
  const userId = crypto.randomUUID();
  const email = `test+${userId}@example.com`;

  const { error } = await supabaseClient
    .from('app_users')
    .insert({
      id: userId,
      email,
      plan,
      stripe_customer_id: null
    });

  if (error) {
    throw error;
  }

  await waitForAssertion(async () => {
    const { data, error: userError } = await supabaseClient
      .from('app_users')
      .select('id')
      .eq('id', userId)
      .limit(1);

    if (userError) {
      throw userError;
    }

    if (!data || data.length !== 1) {
      throw new Error('test user not visible yet');
    }
  });

  const keyResult = await apiKeyManagementService.createKeyForUser(userId, 'test-key');

  await waitForAssertion(async () => {
    const { data, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('id')
      .eq('id', keyResult.id)
      .limit(1);

    if (apiKeyError) {
      throw apiKeyError;
    }

    if (!data || data.length !== 1) {
      throw new Error('test api key not visible yet');
    }
  });

  return {
    userId,
    apiKey: keyResult.apiKey
  };
}

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = buildApp();
  return app;
}
