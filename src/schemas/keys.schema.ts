import { ErrorResponseSchema } from './error.schema';

export const CreateApiKeyBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    label: { type: 'string' }
  }
} as const;

export const CreateApiKeySuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'apiKey', 'label', 'createdAt'],
  properties: {
    id: { type: 'string' },
    apiKey: { type: 'string' },
    label: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' }
  }
} as const;

export const CreateApiKeySchema = {
  body: CreateApiKeyBodySchema,
  response: {
    200: CreateApiKeySuccessResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema
  }
} as const;
