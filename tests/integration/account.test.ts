import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, createTestUserWithApiKey, resetDatabase } from '../helpers/testUtils';
import { supabaseClient } from '../../src/infra/supabaseClient';
import { stripeBillingService } from '../../src/services/billing/stripeBillingService';
import { supabaseStorageService } from '../../src/services/storage/supabaseStorageService';

async function waitForAssertion(assertion: () => Promise<void>, timeoutMs = 10000, intervalMs = 150): Promise<void> {
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

function mockSessionUser(userId: string, email: string): void {
    vi.spyOn(supabaseClient.auth, 'getUser').mockResolvedValue({
        data: {
            user: {
                id: userId,
                email,
            },
        },
        error: null,
    } as any);
}

describe('Account routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await resetDatabase();
        vi.restoreAllMocks();
    });

    it('provisions a signed-in user on GET /api/account/me', async () => {
        const userId = crypto.randomUUID();
        const email = `session+${userId}@example.com`;
        mockSessionUser(userId, email);

        const response = await app.inject({
            method: 'GET',
            url: '/api/account/me',
            headers: {
                authorization: 'Bearer session-token',
            },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as any;
        expect(body.userId).toBe(userId);
        expect(body.email).toBe(email);
        expect(body.plan).toBe('free');

        await waitForAssertion(async () => {
            const { data, error } = await supabaseClient.from('app_users').select('id, email, plan').eq('id', userId).maybeSingle();
            expect(error).toBeNull();
            expect(data?.email).toBe(email);
            expect(data?.plan).toBe('free');
        });
    });

    it('lists and creates API keys for the authenticated account', async () => {
        const { userId } = await createTestUserWithApiKey('basic');
        const email = `account+${userId}@example.com`;

        await supabaseClient.from('app_users').update({ email }).eq('id', userId);
        mockSessionUser(userId, email);

        const listResponse = await app.inject({
            method: 'GET',
            url: '/api/account/keys',
            headers: {
                authorization: 'Bearer session-token',
            },
        });

        expect(listResponse.statusCode).toBe(200);
        const listBody = listResponse.json() as any;
        expect(listBody.items.length).toBe(1);

        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/account/keys',
            headers: {
                authorization: 'Bearer session-token',
            },
            payload: {
                label: 'dashboard-key',
            },
        });

        expect(createResponse.statusCode).toBe(200);
        const createBody = createResponse.json() as any;
        expect(createBody.apiKey).toMatch(/^amb_/);
        expect(createBody.label).toBe('dashboard-key');

        await waitForAssertion(async () => {
            const { data, error } = await supabaseClient.from('api_keys').select('id').eq('user_id', userId);
            expect(error).toBeNull();
            expect((data ?? []).length).toBe(2);
        });
    });

    it('lists backend tracks and exposes WAV downloads when available', async () => {
        const userId = crypto.randomUUID();
        const email = `tracks+${userId}@example.com`;

        mockSessionUser(userId, email);

        await supabaseClient.from('app_users').insert({
            id: userId,
            email,
            plan: 'pro',
            stripe_customer_id: null,
        });

        await supabaseClient.from('tracks').insert({
            id: crypto.randomUUID(),
            user_id: userId,
            storage_path: `tracks/${userId}/track-1.mp3`,
            wav_storage_path: `tracks/${userId}/track-1.wav`,
            format: 'mp3',
            duration_seconds: 60,
            mood: 'calm',
            style: 'ambient',
            tempo: 70,
            length: 60,
            intensity: 'soft',
            provider: 'openai',
            provider_version: 'test-model',
            plan: 'pro',
            watermarked: false,
            commercial_license: false,
        });

        vi.spyOn(supabaseStorageService, 'getDownloadUrl').mockImplementation(async ({ storagePath }) => `https://example.com/${storagePath}`);

        const response = await app.inject({
            method: 'GET',
            url: '/api/account/tracks',
            headers: {
                authorization: 'Bearer session-token',
            },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as any;
        expect(body.items).toHaveLength(1);
        expect(body.items[0].downloadUrl).toContain('.mp3');
        expect(body.items[0].downloadUrlWav).toContain('.wav');
        expect(body.items[0].formatWav).toBe('wav');
    });

    it('creates checkout and portal sessions for authenticated users', async () => {
        const userId = crypto.randomUUID();
        const email = `billing+${userId}@example.com`;
        mockSessionUser(userId, email);

        await supabaseClient.from('app_users').insert({
            id: userId,
            email,
            plan: 'free',
            stripe_customer_id: null,
        });

        vi.spyOn(stripeBillingService, 'createCheckoutSession').mockResolvedValue({ url: 'https://stripe.test/checkout' });
        vi.spyOn(stripeBillingService, 'createPortalSession').mockResolvedValue({ url: 'https://stripe.test/portal' });

        const checkoutResponse = await app.inject({
            method: 'POST',
            url: '/api/account/billing/checkout-session',
            headers: {
                authorization: 'Bearer session-token',
            },
            payload: {
                plan: 'pro',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
            },
        });

        expect(checkoutResponse.statusCode).toBe(200);
        expect((checkoutResponse.json() as any).url).toBe('https://stripe.test/checkout');

        const portalResponse = await app.inject({
            method: 'POST',
            url: '/api/account/billing/portal-session',
            headers: {
                authorization: 'Bearer session-token',
            },
            payload: {
                returnUrl: 'https://example.com/dashboard',
            },
        });

        expect(portalResponse.statusCode).toBe(200);
        expect((portalResponse.json() as any).url).toBe('https://stripe.test/portal');
    });
});