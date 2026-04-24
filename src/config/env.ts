export interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceIdBasic?: string;
  stripePriceIdPro?: string;
  stripePriceIdUltra?: string;
  openAiApiKey: string;
  openAiAudioEndpoint: string;
  openAiAudioModel: string;
  replicateApiToken?: string;
  watermarkFilePath: string | undefined;
  logLevel: string;
  corsOrigins: string[];
  port: number;
  audioAnalysisUrl?: string;
  audioAnalysisTimeoutMs: number;
}

const DEFAULT_CORS_ORIGINS = ['http://localhost:3001', 'http://127.0.0.1:3001'];

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

function getEnvOptional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config: AppConfig = {
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: getEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceIdBasic: getEnvOptional('STRIPE_PRICE_ID_BASIC'),
  stripePriceIdPro: getEnvOptional('STRIPE_PRICE_ID_PRO'),
  stripePriceIdUltra: getEnvOptional('STRIPE_PRICE_ID_ULTRA'),
  openAiApiKey: getEnv('OPENAI_API_KEY'),
  openAiAudioEndpoint: getEnv('OPENAI_AUDIO_ENDPOINT'),
  openAiAudioModel: process.env.OPENAI_AUDIO_MODEL ?? 'gpt-4o-mini-tts',
  replicateApiToken: getEnvOptional('REPLICATE_API_TOKEN'),
  watermarkFilePath: process.env.WATERMARK_FILE_PATH || undefined,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : DEFAULT_CORS_ORIGINS,
  port: Number(process.env.PORT ?? 3000),
  audioAnalysisUrl: getEnvOptional('AUDIO_ANALYSIS_URL'),
  audioAnalysisTimeoutMs: Number(process.env.AUDIO_ANALYSIS_TIMEOUT_MS ?? 45_000),
};
