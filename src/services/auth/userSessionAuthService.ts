import { supabaseClient } from '../../infra/supabaseClient';
import { User } from '../../types/domain';
import { AppError } from '../../types/errors';

export interface AuthenticatedSessionUser {
  user: User;
  accessToken: string;
}

export interface UserSessionAuthService {
  authenticate(accessToken: string): Promise<AuthenticatedSessionUser>;
}

async function ensureAppUser(userId: string, email: string): Promise<User> {
  const { data: existingUser, error: existingUserError } = await supabaseClient
    .from('app_users')
    .select('id, email, plan, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (existingUserError) {
    throw new AppError('Failed to load authenticated user', 'db_error', 500);
  }

  if (existingUser) {
    if (existingUser.email !== email) {
      await supabaseClient.from('app_users').update({ email }).eq('id', userId);
    }

    return {
      id: existingUser.id,
      email,
      plan: existingUser.plan,
      stripeCustomerId: existingUser.stripe_customer_id,
    };
  }

  const { data: insertedUser, error: insertError } = await supabaseClient
    .from('app_users')
    .insert({
      id: userId,
      email,
      plan: 'free',
      stripe_customer_id: null,
    })
    .select('id, email, plan, stripe_customer_id')
    .single();

  if (insertError || !insertedUser) {
    console.error('[ensureAppUser] insert failed', {
      userId,
      email,
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });
    throw new AppError(
      `Failed to provision authenticated user: ${insertError?.message ?? 'unknown'}`,
      'db_error',
      500,
    );
  }

  return {
    id: insertedUser.id,
    email: insertedUser.email,
    plan: insertedUser.plan,
    stripeCustomerId: insertedUser.stripe_customer_id,
  };
}

export const userSessionAuthService: UserSessionAuthService = {
  async authenticate(accessToken: string): Promise<AuthenticatedSessionUser> {
    const { data, error } = await supabaseClient.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AppError('Invalid access token', 'invalid_access_token', 401);
    }

    if (!data.user.email) {
      throw new AppError('Authenticated user has no email address', 'invalid_access_token', 401);
    }

    const user = await ensureAppUser(data.user.id, data.user.email);

    return { user, accessToken };
  },
};
