import { ErrorResponseSchema } from './error.schema';

export const GenerateBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mood', 'style', 'tempo', 'length'],
  properties: {
    mood: {
      type: 'string',
      enum: ['calm', 'dreamy', 'cinematic', 'dark', 'uplifting', 'sci-fi', 'ethereal']
    },
    style: {
      type: 'string',
      enum: ['ambient', 'drone', 'chillwave', 'lo-fi ambient', 'cosmic']
    },
    tempo: {
      type: 'integer',
      minimum: 50,
      maximum: 90
    },
    length: {
      type: 'integer',
      minimum: 30,
      maximum: 120
    },
    intensity: {
      type: 'string',
      enum: ['soft', 'medium', 'high']
    }
  }
} as const;

export const GenerateSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'status', 'downloadUrl', 'format', 'expiresIn', 'metadata'],
  properties: {
    id: { type: 'string' },
    status: { type: 'string', const: 'completed' },
    downloadUrl: { type: 'string' },
    format: { type: 'string', const: 'mp3' },
    expiresIn: { type: 'integer', minimum: 1 },
    metadata: {
      type: 'object',
      additionalProperties: false,
      required: ['tempo', 'mood', 'duration', 'style', 'intensity', 'provider', 'plan', 'watermarked', 'commercialLicense'],
      properties: {
        tempo: { type: 'integer', minimum: 50, maximum: 90 },
        mood: { type: 'string' },
        duration: { type: 'integer', minimum: 30, maximum: 120 },
        style: { type: 'string' },
        intensity: { type: 'string', enum: ['soft', 'medium', 'high'] },
        provider: { type: 'string', const: 'openai' },
        plan: { type: 'string', enum: ['free', 'basic', 'pro', 'ultra'] },
        watermarked: { type: 'boolean' },
        commercialLicense: { type: 'boolean' }
      }
    },
    downloadUrlWav: { type: 'string' },
    formatWav: { type: 'string', const: 'wav' }
  }
} as const;

export const GenerateSchema = {
  body: GenerateBodySchema,
  response: {
    200: GenerateSuccessResponseSchema,
    '4xx': ErrorResponseSchema,
    '5xx': ErrorResponseSchema
  }
} as const;
