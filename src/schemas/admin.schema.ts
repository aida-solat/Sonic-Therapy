import { ErrorResponseSchema } from './error.schema';

export const AdminRetryAnalysesBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 500 },
    minAgeSeconds: { type: 'integer', minimum: 0, maximum: 86_400 },
    statuses: {
      type: 'array',
      items: { type: 'string', enum: ['failed', 'pending'] },
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
    },
  },
} as const;

export const AdminRetryAnalysesResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['totalCandidates', 'attempted', 'succeeded', 'failed', 'skipped', 'trackIds'],
  properties: {
    totalCandidates: { type: 'integer' },
    attempted: { type: 'integer' },
    succeeded: { type: 'integer' },
    failed: { type: 'integer' },
    skipped: { type: 'integer' },
    trackIds: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

export const AdminRetryAnalysesSchema = {
  body: AdminRetryAnalysesBodySchema,
  response: {
    200: AdminRetryAnalysesResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema,
  },
} as const;
