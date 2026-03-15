import type {
  AccountApiKeysResponse,
  AccountMeResponse,
  AccountTracksResponse,
  BillingSessionResponse,
  CreateApiKeyResponse,
  ErrorResponse,
  GenerateRequest,
  GenerateResponse,
  HealthResponse,
  MeResponse,
  TherapyRequest,
  TherapyResponse,
  TrackRatingRequest,
  TrackEvaluationSummary,
} from '@/lib/types';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(input, {
        ...init,
        headers: {
          ...(hasBody ? { 'content-type': 'application/json' } : {}),
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        let payload: ErrorResponse | null = null;
        try {
          payload = (await response.json()) as ErrorResponse;
        } catch {
          payload = null;
        }

        const message = payload?.error?.message ?? `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isNetworkError =
        lastError.message === 'Failed to fetch' || lastError.message.includes('network');
      if (!isNetworkError || attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  throw lastError!;
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    authorization: `Bearer ${apiKey}`,
  };
}

function sessionHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export const api = {
  async getHealth(baseUrl: string): Promise<HealthResponse> {
    return request<HealthResponse>(`${normalizeBaseUrl(baseUrl)}/healthz`, {
      method: 'GET',
      headers: {},
    });
  },

  async getMe(baseUrl: string, apiKey: string): Promise<MeResponse> {
    return request<MeResponse>(`${normalizeBaseUrl(baseUrl)}/api/me`, {
      method: 'GET',
      headers: authHeaders(apiKey),
    });
  },

  async getAccountMe(baseUrl: string, accessToken: string): Promise<AccountMeResponse> {
    return request<AccountMeResponse>(`${normalizeBaseUrl(baseUrl)}/api/account/me`, {
      method: 'GET',
      headers: sessionHeaders(accessToken),
    });
  },

  async listAccountKeys(baseUrl: string, accessToken: string): Promise<AccountApiKeysResponse> {
    return request<AccountApiKeysResponse>(`${normalizeBaseUrl(baseUrl)}/api/account/keys`, {
      method: 'GET',
      headers: sessionHeaders(accessToken),
    });
  },

  async createKey(baseUrl: string, apiKey: string, label: string): Promise<CreateApiKeyResponse> {
    return request<CreateApiKeyResponse>(`${normalizeBaseUrl(baseUrl)}/api/keys`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({ label }),
    });
  },

  async createAccountKey(
    baseUrl: string,
    accessToken: string,
    label: string,
  ): Promise<CreateApiKeyResponse> {
    return request<CreateApiKeyResponse>(`${normalizeBaseUrl(baseUrl)}/api/account/keys`, {
      method: 'POST',
      headers: sessionHeaders(accessToken),
      body: JSON.stringify({ label }),
    });
  },

  async deleteAccountKey(
    baseUrl: string,
    accessToken: string,
    keyId: string,
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`${normalizeBaseUrl(baseUrl)}/api/account/keys/${keyId}`, {
      method: 'DELETE',
      headers: sessionHeaders(accessToken),
    });
  },

  async listAccountTracks(baseUrl: string, accessToken: string): Promise<AccountTracksResponse> {
    return request<AccountTracksResponse>(`${normalizeBaseUrl(baseUrl)}/api/account/tracks`, {
      method: 'GET',
      headers: sessionHeaders(accessToken),
    });
  },

  async createCheckoutSession(
    baseUrl: string,
    accessToken: string,
    payload: { plan: 'basic' | 'pro' | 'ultra'; successUrl: string; cancelUrl: string },
  ): Promise<BillingSessionResponse> {
    return request<BillingSessionResponse>(
      `${normalizeBaseUrl(baseUrl)}/api/account/billing/checkout-session`,
      {
        method: 'POST',
        headers: sessionHeaders(accessToken),
        body: JSON.stringify(payload),
      },
    );
  },

  async createPortalSession(
    baseUrl: string,
    accessToken: string,
    payload: { returnUrl: string },
  ): Promise<BillingSessionResponse> {
    return request<BillingSessionResponse>(
      `${normalizeBaseUrl(baseUrl)}/api/account/billing/portal-session`,
      {
        method: 'POST',
        headers: sessionHeaders(accessToken),
        body: JSON.stringify(payload),
      },
    );
  },

  async generateTrack(
    baseUrl: string,
    apiKey: string,
    payload: GenerateRequest,
  ): Promise<GenerateResponse> {
    return request<GenerateResponse>(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });
  },

  async generateTherapyTrack(
    baseUrl: string,
    apiKey: string,
    payload: TherapyRequest,
  ): Promise<TherapyResponse> {
    return request<TherapyResponse>(`${normalizeBaseUrl(baseUrl)}/api/generate/therapy`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    });
  },

  async rateTrack(
    baseUrl: string,
    accessToken: string,
    trackId: string,
    payload: TrackRatingRequest,
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `${normalizeBaseUrl(baseUrl)}/api/account/tracks/${trackId}/rate`,
      {
        method: 'POST',
        headers: sessionHeaders(accessToken),
        body: JSON.stringify(payload),
      },
    );
  },

  async getTrackEvaluation(
    baseUrl: string,
    accessToken: string,
    trackId: string,
  ): Promise<TrackEvaluationSummary> {
    return request<TrackEvaluationSummary>(
      `${normalizeBaseUrl(baseUrl)}/api/account/tracks/${trackId}/evaluation`,
      {
        method: 'GET',
        headers: sessionHeaders(accessToken),
      },
    );
  },
};
