import { ErrorResponseSchema } from './error.schema';

export const StripeWebhookSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['received'],
  properties: {
    received: { type: 'boolean', const: true }
  }
} as const;

export const StripeWebhookSchema = {
  response: {
    200: StripeWebhookSuccessResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema
  }
} as const;
