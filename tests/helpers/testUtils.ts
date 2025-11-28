import crypto from 'crypto';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';
import { supabaseClient } from '../../src/infra/supabaseClient';
import { apiKeyManagementService } from '../../src/services/auth/apiKeyManagementService';
import type { PlanType } from '../../src/types/domain';

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

  const keyResult = await apiKeyManagementService.createKeyForUser(userId, 'test-key');

  return {
    userId,
    apiKey: keyResult.apiKey
  };
}

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = buildApp();
  return app;
}
