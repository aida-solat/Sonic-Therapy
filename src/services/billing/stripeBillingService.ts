import Stripe from 'stripe';

import { config } from '../../config/env';
import { stripeClient } from '../../infra/stripeClient';
import { supabaseClient } from '../../infra/supabaseClient';
import { User, PlanType } from '../../types/domain';
import { AppError } from '../../types/errors';

export interface StripeBillingService {
    createCheckoutSession(params: {
        user: User;
        plan: Exclude<PlanType, 'free'>;
        successUrl: string;
        cancelUrl: string;
    }): Promise<{ url: string }>;
    createPortalSession(params: { user: User; returnUrl: string }): Promise<{ url: string }>;
}

function getPriceIdForPlan(plan: Exclude<PlanType, 'free'>): string {
    switch (plan) {
        case 'basic':
            if (!config.stripePriceIdBasic) {
                throw new AppError('Missing Stripe price id for basic plan', 'stripe_config_error', 500);
            }
            return config.stripePriceIdBasic;
        case 'pro':
            if (!config.stripePriceIdPro) {
                throw new AppError('Missing Stripe price id for pro plan', 'stripe_config_error', 500);
            }
            return config.stripePriceIdPro;
        case 'ultra':
            if (!config.stripePriceIdUltra) {
                throw new AppError('Missing Stripe price id for ultra plan', 'stripe_config_error', 500);
            }
            return config.stripePriceIdUltra;
    }
}

function assertHttpUrl(url: string, label: string): void {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid protocol');
        }
    } catch {
        throw new AppError(`Invalid ${label}`, 'validation_error', 400);
    }
}

async function persistStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    const { error } = await supabaseClient
        .from('app_users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

    if (error) {
        throw new AppError('Failed to save Stripe customer id', 'db_error', 500);
    }
}

async function ensureStripeCustomer(user: User): Promise<string> {
    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: {
            user_id: user.id,
        },
    });

    await persistStripeCustomerId(user.id, customer.id);
    return customer.id;
}

export const stripeBillingService: StripeBillingService = {
    async createCheckoutSession(params): Promise<{ url: string }> {
        assertHttpUrl(params.successUrl, 'successUrl');
        assertHttpUrl(params.cancelUrl, 'cancelUrl');

        const customerId = await ensureStripeCustomer(params.user);
        const session = await stripeClient.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: getPriceIdForPlan(params.plan),
                    quantity: 1,
                },
            ],
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            client_reference_id: params.user.id,
            metadata: {
                user_id: params.user.id,
                plan: params.plan,
            },
            subscription_data: {
                metadata: {
                    user_id: params.user.id,
                    plan: params.plan,
                },
            },
            allow_promotion_codes: true,
        });

        if (!session.url) {
            throw new AppError('Failed to create checkout session', 'stripe_error', 500);
        }

        return { url: session.url };
    },

    async createPortalSession(params): Promise<{ url: string }> {
        assertHttpUrl(params.returnUrl, 'returnUrl');

        const customerId = await ensureStripeCustomer(params.user);
        const session = await stripeClient.billingPortal.sessions.create({
            customer: customerId,
            return_url: params.returnUrl,
        });

        return { url: session.url };
    },
};
