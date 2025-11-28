import crypto from 'crypto';

import { supabaseClient } from '../../infra/supabaseClient';
import { AppError } from '../../types/errors';

export interface ApiKeyManagementService {
  createKeyForUser(userId: string, label?: string | null): Promise<{
    id: string;
    apiKey: string;
    label: string | null;
    createdAt: string;
  }>;
}

function generateRawApiKey(): string {
  // 32 bytes → 64 hex chars, prefixed for readability
  const random = crypto.randomBytes(32).toString('hex');
  return `amb_${random}`;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export const apiKeyManagementService: ApiKeyManagementService = {
  async createKeyForUser(userId: string, label?: string | null) {
    const rawKey = generateRawApiKey();
    const keyHash = hashApiKey(rawKey);

    const { data, error } = await supabaseClient
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        label: label ?? null,
        status: 'active'
      })
      .select('id, label, created_at')
      .single();

    if (error || !data) {
      throw new AppError('Failed to create API key', 'db_error', 500);
    }

    return {
      id: data.id,
      apiKey: rawKey,
      label: data.label ?? null,
      createdAt: data.created_at
    };
  }
};
