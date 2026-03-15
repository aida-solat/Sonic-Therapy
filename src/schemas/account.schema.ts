import { ErrorResponseSchema } from './error.schema';

export const AccountMeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'userId',
    'email',
    'plan',
    'dailyQuota',
    'usedToday',
    'remainingToday',
    'hasBillingCustomer',
  ],
  properties: {
    userId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    plan: { type: 'string', enum: ['free', 'basic', 'pro', 'ultra'] },
    dailyQuota: { type: 'integer', minimum: 0 },
    usedToday: { type: 'integer', minimum: 0 },
    remainingToday: { type: 'integer', minimum: 0 },
    stripeCustomerId: { type: ['string', 'null'] },
    hasBillingCustomer: { type: 'boolean' },
  },
} as const;

export const AccountApiKeySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'status', 'createdAt'],
  properties: {
    id: { type: 'string' },
    label: { type: ['string', 'null'] },
    status: { type: 'string', enum: ['active', 'disabled', 'revoked'] },
    lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const AccountKeysListSchema = {
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: AccountApiKeySchema,
        },
      },
    },
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountCreateKeySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [],
    properties: {
      label: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'apiKey', 'label', 'createdAt'],
      properties: {
        id: { type: 'string' },
        apiKey: { type: 'string' },
        label: { type: ['string', 'null'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountTracksSchema = {
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'format', 'createdAt', 'downloadUrl', 'metadata'],
            properties: {
              id: { type: 'string' },
              format: { type: 'string', enum: ['mp3', 'wav'] },
              createdAt: { type: 'string', format: 'date-time' },
              downloadUrl: { type: 'string' },
              downloadUrlWav: { type: 'string' },
              formatWav: { type: 'string', enum: ['wav'] },
              trackType: { type: 'string', enum: ['standard', 'therapy'] },
              therapyFrequency: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  band: { type: 'string', enum: ['delta', 'theta', 'alpha', 'beta', 'gamma'] },
                  hz: { type: 'number' },
                  solfeggioHz: { type: 'number' },
                  label: { type: 'string' },
                },
              },
              metadata: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'tempo',
                  'mood',
                  'duration',
                  'style',
                  'intensity',
                  'provider',
                  'plan',
                  'watermarked',
                  'commercialLicense',
                ],
                properties: {
                  tempo: { type: 'integer' },
                  mood: { type: 'string' },
                  duration: { type: 'integer' },
                  style: { type: 'string' },
                  intensity: { type: 'string', enum: ['soft', 'medium', 'high'] },
                  provider: { type: 'string', enum: ['openai'] },
                  providerVersion: { type: ['string', 'null'] },
                  plan: { type: 'string', enum: ['free', 'basic', 'pro', 'ultra'] },
                  watermarked: { type: 'boolean' },
                  commercialLicense: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const BillingCheckoutBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plan', 'successUrl', 'cancelUrl'],
  properties: {
    plan: { type: 'string', enum: ['basic', 'pro', 'ultra'] },
    successUrl: { type: 'string', format: 'uri' },
    cancelUrl: { type: 'string', format: 'uri' },
  },
} as const;

export const BillingPortalBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['returnUrl'],
  properties: {
    returnUrl: { type: 'string', format: 'uri' },
  },
} as const;

export const BillingSessionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['url'],
  properties: {
    url: { type: 'string', format: 'uri' },
  },
} as const;

export const AccountBillingCheckoutSchema = {
  body: BillingCheckoutBodySchema,
  response: {
    200: BillingSessionResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountBillingPortalSchema = {
  body: BillingPortalBodySchema,
  response: {
    200: BillingSessionResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountDeleteKeySchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['keyId'],
    properties: {
      keyId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
      },
    },
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountMeSchema = {
  response: {
    200: AccountMeResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

/* ── Track Rating Schemas ── */

export const TrackRateBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['satisfaction', 'moodAccuracy', 'styleAccuracy', 'audioQuality'],
  properties: {
    satisfaction: { type: 'integer', minimum: 1, maximum: 5 },
    moodAccuracy: { type: 'integer', minimum: 1, maximum: 5 },
    styleAccuracy: { type: 'integer', minimum: 1, maximum: 5 },
    audioQuality: { type: 'integer', minimum: 1, maximum: 5 },
    comment: { type: 'string', maxLength: 500 },
  },
} as const;

export const TrackEvaluationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'trackId',
    'avgSatisfaction',
    'avgMoodAccuracy',
    'avgStyleAccuracy',
    'avgAudioQuality',
    'overallScore',
    'totalRatings',
  ],
  properties: {
    trackId: { type: 'string' },
    avgSatisfaction: { type: 'number' },
    avgMoodAccuracy: { type: 'number' },
    avgStyleAccuracy: { type: 'number' },
    avgAudioQuality: { type: 'number' },
    overallScore: { type: 'number' },
    totalRatings: { type: 'integer' },
  },
} as const;

export const AccountTrackRateSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['trackId'],
    properties: {
      trackId: { type: 'string', format: 'uuid' },
    },
  },
  body: TrackRateBodySchema,
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
      },
    },
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;

export const AccountTrackEvaluationSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['trackId'],
    properties: {
      trackId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: TrackEvaluationResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;
