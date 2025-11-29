import Stripe from 'stripe';

import { stripeClient } from '../../infra/stripeClient';
import { config } from '../../config/env';
import { supabaseClient } from '../../infra/supabaseClient';
import { AppError } from '../../types/errors';
import { PlanType } from '../../types/domain';
import { logger } from '../../infra/logger';

export interface StripeWebhookService {
  handleEvent(rawBody: Buffer | string | unknown, signature: string | string[] | undefined): Promise<void>;
}

function normalizeSignature(signature: string | string[] | undefined): string | null {
  if (!signature) return null;
  return Array.isArray(signature) ? signature[0] : signature;
}

function getPlanFromMetadata(metadata: Record<string, any> | null | undefined): PlanType | null {
  const plan = metadata?.plan as string | undefined;
  if (plan === 'free' || plan === 'basic' || plan === 'pro' || plan === 'ultra') {
    return plan;
  }
  return null;
}

async function resolvePlanFromSubscription(subscription: Stripe.Subscription): Promise<PlanType | null> {
  const directPlan = getPlanFromMetadata(subscription.metadata ?? {});
  if (directPlan) {
    return directPlan;
  }

  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const itemPlan = getPlanFromMetadata((item.metadata ?? {}) as Record<string, any>);
    if (itemPlan) {
      return itemPlan;
    }

    const price = item.price;
    if (price) {
      const pricePlan = getPlanFromMetadata((price.metadata ?? {}) as Record<string, any>);
      if (pricePlan) {
        return pricePlan;
      }

      const productRef = price.product;
      if (productRef && typeof productRef === 'object' && (productRef as Stripe.Product).metadata) {
        const productPlan = getPlanFromMetadata(((productRef as Stripe.Product).metadata ?? {}) as Record<string, any>);
        if (productPlan) {
          return productPlan;
        }
      } else if (typeof productRef === 'string') {
        const product = await stripeClient.products.retrieve(productRef);
        const productPlan = getPlanFromMetadata((product.metadata ?? {}) as Record<string, any>);
        if (productPlan) {
          return productPlan;
        }
      }
    }
  }

  return null;
}

async function upsertUserPlan(params: {
  userId: string;
  plan: PlanType;
  stripeCustomerId?: string | null;
  email?: string | null;
}): Promise<void> {
  const { userId, plan, stripeCustomerId, email } = params;

  const { data: userRows, error: selectError } = await supabaseClient
    .from('app_users')
    .select('id')
    .eq('id', userId);

  if (selectError) {
    throw new AppError('Failed to load user for Stripe webhook', 'db_error', 500);
  }

  if (!userRows || userRows.length === 0) {
    const { error: insertError } = await supabaseClient.from('app_users').insert({
      id: userId,
      email,
      plan,
      stripe_customer_id: stripeCustomerId ?? null
    });

    if (insertError) {
      throw new AppError('Failed to create user from Stripe webhook', 'db_error', 500);
    }
  } else {
    const { error: updateError } = await supabaseClient
      .from('app_users')
      .update({
        plan,
        stripe_customer_id: stripeCustomerId ?? null
      })
      .eq('id', userId);

    if (updateError) {
      throw new AppError('Failed to update user from Stripe webhook', 'db_error', 500);
    }
  }
}

async function findUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from('app_users')
    .select('id')
    .eq('stripe_customer_id', customerId);

  if (error) {
    throw new AppError('Failed to load user by Stripe customer id', 'db_error', 500);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0].id as string;
}

async function logAndEnsureEvent(event: Stripe.Event): Promise<number> {
  const eventId = event.id;

  const { data: existingRows, error: selectError } = await supabaseClient
    .from('stripe_webhook_events')
    .select('id, processed_at')
    .eq('stripe_event_id', eventId);

  if (selectError) {
    logger.error({ err: selectError }, 'Failed to load Stripe webhook event');
    throw new AppError('Failed to load Stripe webhook event', 'db_error', 500);
  }

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0] as { id: number; processed_at: string | null };
    if (existing.processed_at) {
      // already processed – idempotent no-op
      logger.debug({ eventId }, 'Stripe webhook event already processed, skipping');
      return -1;
    }
    logger.debug({ eventId, rowId: existing.id }, 'Stripe webhook event loaded for retry');
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabaseClient
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event,
      processed_at: null
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    logger.error({ err: insertError }, 'Failed to log Stripe webhook event');
    throw new AppError('Failed to log Stripe webhook event', 'db_error', 500);
  }

  logger.debug({ eventId, rowId: inserted.id }, 'Logged new Stripe webhook event');

  return inserted.id as number;
}

async function markEventProcessed(rowId: number): Promise<void> {
  if (rowId <= 0) return;
  const { error } = await supabaseClient
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', rowId);

  if (error) {
    logger.error({ err: error }, 'Failed to mark Stripe webhook event as processed');
    throw new AppError('Failed to mark Stripe webhook event as processed', 'db_error', 500);
  }
}

export const stripeWebhookService: StripeWebhookService = {
  async handleEvent(rawBody: Buffer | string | unknown, signature: string | string[] | undefined): Promise<void> {
    const normalizedSignature = normalizeSignature(signature);
    if (!normalizedSignature) {
      logger.warn('Missing Stripe-Signature header');
      throw new AppError('Missing Stripe-Signature header', 'missing_stripe_signature', 400);
    }

    const payloadString =
      typeof rawBody === 'string'
        ? rawBody
        : Buffer.isBuffer(rawBody)
        ? rawBody.toString('utf8')
        : JSON.stringify(rawBody ?? '');

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(payloadString, normalizedSignature, config.stripeWebhookSecret);
    } catch (err) {
      logger.warn({ err }, 'Invalid Stripe signature');
      throw new AppError('Invalid Stripe signature', 'invalid_stripe_signature', 400);
    }

    logger.info({ id: event.id, type: event.type }, 'Received Stripe webhook event');

    const rowId = await logAndEnsureEvent(event);
    if (rowId === -1) {
      // already processed
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = (session.metadata ?? {}) as Record<string, any>;
          const plan = getPlanFromMetadata(metadata);
          const rawUserId = metadata.user_id;
          const userId = typeof rawUserId === 'string' && rawUserId.trim().length > 0 ? rawUserId : null;
          const stripeCustomerId =
            typeof session.customer === 'string'
              ? (session.customer as string)
              : session.customer
              ? (session.customer as Stripe.Customer).id
              : null;
          const email = session.customer_details?.email ?? null;

          if (plan && userId) {
            await upsertUserPlan({
              userId,
              plan,
              stripeCustomerId,
              email
            });
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeCustomerId =
            typeof subscription.customer === 'string'
              ? (subscription.customer as string)
              : (subscription.customer as Stripe.Customer | null)?.id ?? null;

          if (!stripeCustomerId) {
            break;
          }

          const userId = await findUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId) {
            break;
          }

          if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
            await upsertUserPlan({ userId, plan: 'free', stripeCustomerId });
            break;
          }

          const plan = await resolvePlanFromSubscription(subscription);
          if (plan) {
            await upsertUserPlan({ userId, plan, stripeCustomerId });
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const stripeCustomerId =
            typeof invoice.customer === 'string'
              ? (invoice.customer as string)
              : (invoice.customer as Stripe.Customer | null)?.id ?? null;

          if (stripeCustomerId) {
            const userId = await findUserIdByStripeCustomerId(stripeCustomerId);
            if (userId) {
              await upsertUserPlan({ userId, plan: 'free', stripeCustomerId });
            }
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeCustomerId =
            typeof subscription.customer === 'string'
              ? (subscription.customer as string)
              : (subscription.customer as Stripe.Customer | null)?.id ?? null;

          if (stripeCustomerId) {
            const userId = await findUserIdByStripeCustomerId(stripeCustomerId);
            if (userId) {
              await upsertUserPlan({ userId, plan: 'free', stripeCustomerId });
            }
          }
          break;
        }
        default:
          // سایر eventها فقط لاگ می‌شوند و تغییری در plan ایجاد نمی‌کنند
          break;
      }

      await markEventProcessed(rowId);
    } catch (err) {
      // اگر منطق تجاری شکست بخورد، processed_at را ست نمی‌کنیم تا امکان retry وجود داشته باشد
      logger.error({ err, eventId: event.id, eventType: event.type }, 'Error while processing Stripe webhook event');
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to process Stripe webhook event', 'stripe_webhook_error', 500);
    }
  }
};
