import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';

import { buildTestApp, resetDatabase, createTestUserWithApiKey } from '../helpers/testUtils';
import { supabaseClient } from '../../src/infra/supabaseClient';

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set in test environment');
  }
  return secret;
}

// Local Stripe client used only for generating valid test webhook signatures.
const stripeTestClient = new Stripe('sk_test_dummy' as string);

function generateStripeSignature(payload: string, secret: string): string {
  return stripeTestClient.webhooks.generateTestHeaderString({
    payload,
    secret
  });
}

describe('POST /webhooks/stripe', () => {
  let app: FastifyInstance;
  let userId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
    const result = await createTestUserWithApiKey('free');
    userId = result.userId;
  });

  it('handles checkout.session.completed by updating user plan and logging the event', async () => {
    const webhookSecret = getStripeWebhookSecret();

    const session: any = {
      id: 'cs_test_123',
      object: 'checkout.session',
      metadata: {
        plan: 'pro',
        user_id: userId
      },
      customer: 'cus_test_123',
      customer_details: {
        email: 'stripe-user@example.com'
      }
    };

    const event: any = {
      id: 'evt_test_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: session
      }
    };

    const payload = JSON.stringify(event);

    // Generate a valid Stripe webhook signature header for the payload.
    const signature = generateStripeSignature(payload, webhookSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json'
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body).toEqual({ received: true });

    // User plan and stripe_customer_id should be updated
    const { data: users, error: usersError } = await supabaseClient
      .from('app_users')
      .select('plan, stripe_customer_id')
      .eq('id', userId);

    expect(usersError).toBeNull();
    expect(users).not.toBeNull();
    expect((users ?? []).length).toBe(1);

    const user = (users ?? [])[0] as any;
    expect(user.plan).toBe('pro');
    expect(user.stripe_customer_id).toBe('cus_test_123');

    // Webhook event should be logged and marked processed
    const { data: events, error: eventsError } = await supabaseClient
      .from('stripe_webhook_events')
      .select('stripe_event_id, type, processed_at')
      .eq('stripe_event_id', 'evt_test_1');

    expect(eventsError).toBeNull();
    expect(events).not.toBeNull();
    expect((events ?? []).length).toBe(1);

    const logged = (events ?? [])[0] as any;
    expect(logged.type).toBe('checkout.session.completed');
    expect(logged.processed_at).not.toBeNull();
  });

  it('handles customer.subscription.updated by changing existing user plan based on metadata', async () => {
    const webhookSecret = getStripeWebhookSecret();

    // Attach a Stripe customer id and initial plan to the existing user
    const customerId = 'cus_sub_123';
    {
      const { error } = await supabaseClient
        .from('app_users')
        .update({ plan: 'basic', stripe_customer_id: customerId })
        .eq('id', userId);

      expect(error).toBeNull();
    }

    async function expectUserPlan(expectedPlan: string): Promise<void> {
      const { data, error } = await supabaseClient
        .from('app_users')
        .select('plan')
        .eq('id', userId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect((data ?? []).length).toBe(1);
      const row = (data ?? [])[0] as any;
      expect(row.plan).toBe(expectedPlan);
    }

    async function sendSubscriptionUpdatedEvent(plan: string): Promise<void> {
      const subscription: any = {
        id: 'sub_test_123',
        object: 'subscription',
        metadata: {
          plan
        },
        customer: customerId
      };

      const event: any = {
        id: `evt_sub_${plan}`,
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: subscription
        }
      };

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, webhookSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json'
        },
        payload
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as any;
      expect(body).toEqual({ received: true });
    }

    // basic -> pro
    await sendSubscriptionUpdatedEvent('pro');
    await expectUserPlan('pro');

    // pro -> ultra
    await sendSubscriptionUpdatedEvent('ultra');
    await expectUserPlan('ultra');

    // ultra -> basic
    await sendSubscriptionUpdatedEvent('basic');
    await expectUserPlan('basic');

    // cancellation -> free
    await sendSubscriptionUpdatedEvent('free');
    await expectUserPlan('free');
  }, 20000);

  it('handles invoice.payment_failed by downgrading user plan to free', async () => {
    const webhookSecret = getStripeWebhookSecret();

    const customerId = 'cus_fail_123';

    // Ensure the user represents a paying customer before failure
    {
      const { error } = await supabaseClient
        .from('app_users')
        .update({ plan: 'pro', stripe_customer_id: customerId })
        .eq('id', userId);

      expect(error).toBeNull();
    }

    const invoice: any = {
      id: 'in_test_1',
      object: 'invoice',
      customer: customerId
    };

    const event: any = {
      id: 'evt_invoice_fail_1',
      object: 'event',
      type: 'invoice.payment_failed',
      data: {
        object: invoice
      }
    };

    const payload = JSON.stringify(event);
    const signature = generateStripeSignature(payload, webhookSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json'
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body).toEqual({ received: true });

    const { data: users, error: usersError } = await supabaseClient
      .from('app_users')
      .select('plan, stripe_customer_id')
      .eq('id', userId);

    expect(usersError).toBeNull();
    expect(users).not.toBeNull();
    expect((users ?? []).length).toBe(1);

    const user = (users ?? [])[0] as any;
    expect(user.plan).toBe('free');
    expect(user.stripe_customer_id).toBe(customerId);
  });

  it('does not re-process an already processed event (idempotency)', async () => {
    const webhookSecret = getStripeWebhookSecret();

    const customerId = 'cus_idem_123';

    // Attach customer id and initial plan
    {
      const { error } = await supabaseClient
        .from('app_users')
        .update({ plan: 'basic', stripe_customer_id: customerId })
        .eq('id', userId);

      expect(error).toBeNull();
    }

    const subscription: any = {
      id: 'sub_idem_1',
      object: 'subscription',
      metadata: {
        plan: 'pro'
      },
      customer: customerId
    };

    const event: any = {
      id: 'evt_idem_1',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: subscription
      }
    };

    const payload = JSON.stringify(event);

    // First delivery
    const signature1 = generateStripeSignature(payload, webhookSecret);
    const response1 = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'stripe-signature': signature1,
        'content-type': 'application/json'
      },
      payload
    });

    expect(response1.statusCode).toBe(200);

    // After first processing, user plan should be updated to pro
    let { data: usersAfterFirst, error: usersErrorFirst } = await supabaseClient
      .from('app_users')
      .select('plan')
      .eq('id', userId);

    expect(usersErrorFirst).toBeNull();
    expect(usersAfterFirst).not.toBeNull();
    expect((usersAfterFirst ?? []).length).toBe(1);
    let userRow = (usersAfterFirst ?? [])[0] as any;
    expect(userRow.plan).toBe('pro');

    // Webhook event should be logged once and marked processed
    let { data: eventsAfterFirst, error: eventsErrorFirst } = await supabaseClient
      .from('stripe_webhook_events')
      .select('stripe_event_id, processed_at')
      .eq('stripe_event_id', 'evt_idem_1');

    expect(eventsErrorFirst).toBeNull();
    expect(eventsAfterFirst).not.toBeNull();
    expect((eventsAfterFirst ?? []).length).toBe(1);
    let eventRow = (eventsAfterFirst ?? [])[0] as any;
    expect(eventRow.processed_at).not.toBeNull();
    const processedAtFirst = eventRow.processed_at;

    // Second delivery of the exact same event
    const signature2 = generateStripeSignature(payload, webhookSecret);
    const response2 = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'stripe-signature': signature2,
        'content-type': 'application/json'
      },
      payload
    });

    expect(response2.statusCode).toBe(200);

    // User plan should remain pro and not be changed back or modified
    let { data: usersAfterSecond, error: usersErrorSecond } = await supabaseClient
      .from('app_users')
      .select('plan')
      .eq('id', userId);

    expect(usersErrorSecond).toBeNull();
    expect(usersAfterSecond).not.toBeNull();
    expect((usersAfterSecond ?? []).length).toBe(1);
    userRow = (usersAfterSecond ?? [])[0] as any;
    expect(userRow.plan).toBe('pro');

    // Event log should still contain a single row and processed_at should not change
    let { data: eventsAfterSecond, error: eventsErrorSecond } = await supabaseClient
      .from('stripe_webhook_events')
      .select('stripe_event_id, processed_at')
      .eq('stripe_event_id', 'evt_idem_1');

    expect(eventsErrorSecond).toBeNull();
    expect(eventsAfterSecond).not.toBeNull();
    expect((eventsAfterSecond ?? []).length).toBe(1);
    eventRow = (eventsAfterSecond ?? [])[0] as any;
    expect(eventRow.processed_at).toBe(processedAtFirst);
  });
});
