import crypto from 'crypto';

import { supabaseClient } from '../../infra/supabaseClient';
import { ApiKey, User } from '../../types/domain';
import { AppError } from '../../types/errors';

export interface ApiKeyAuthService {
  authenticate(apiKey: string): Promise<{ user: User; apiKey: ApiKey }>;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export const apiKeyAuthService: ApiKeyAuthService = {
  async authenticate(apiKey: string): Promise<{ user: User; apiKey: ApiKey }> {
    const hashed = hashApiKey(apiKey);

    const { data: apiKeyRows, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('id, user_id, status, label')
      .eq('key_hash', hashed)
      .eq('status', 'active');

    if (apiKeyError) {
      throw new AppError('Failed to validate API key', 'db_error', 500);
    }

    const apiKeyRow = apiKeyRows && apiKeyRows[0];

    if (!apiKeyRow) {
      throw new AppError('Invalid API key', 'invalid_api_key', 401);
    }

    const { data: userRow, error: userError } = await supabaseClient
      .from('app_users')
      .select('id, email, plan, stripe_customer_id')
      .eq('id', apiKeyRow.user_id)
      .single();

    if (userError || !userRow) {
      throw new AppError('Invalid API key', 'invalid_api_key', 401);
    }

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      plan: userRow.plan,
      stripeCustomerId: userRow.stripe_customer_id
    };

    const apiKeyEntity: ApiKey = {
      id: apiKeyRow.id,
      userId: apiKeyRow.user_id,
      status: apiKeyRow.status,
      label: apiKeyRow.label ?? null
    };

    // Fire-and-forget update of last_used_at
    supabaseClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRow.id)
      .then(() => { }, () => { });

    return { user, apiKey: apiKeyEntity };
  }
};
