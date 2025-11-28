import { ErrorResponseSchema } from './error.schema';

export const MeSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['userId', 'plan', 'dailyQuota', 'usedToday', 'remainingToday'],
  properties: {
    userId: { type: 'string' },
    plan: { type: 'string', enum: ['free', 'basic', 'pro', 'ultra'] },
    dailyQuota: { type: 'integer', minimum: 0 },
    usedToday: { type: 'integer', minimum: 0 },
    remainingToday: { type: 'integer', minimum: 0 }
  }
} as const;

export const MeSchema = {
  response: {
    200: MeSuccessResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema
  }
} as const;
