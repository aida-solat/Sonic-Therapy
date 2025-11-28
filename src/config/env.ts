export interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  openAiApiKey: string;
  port: number;
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const config: AppConfig = {
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: getEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
  openAiApiKey: getEnv('OPENAI_API_KEY'),
  port: Number(process.env.PORT ?? 3000)
};
