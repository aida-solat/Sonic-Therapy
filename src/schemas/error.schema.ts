export const ErrorResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message', 'status'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        status: { type: 'integer' }
      }
    }
  }
} as const;
