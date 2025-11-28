export type PlanType = 'free' | 'basic' | 'pro' | 'ultra';

export interface User {
  id: string;
  email: string;
  plan: PlanType;
  stripeCustomerId?: string | null;
}

export type ApiKeyStatus = 'active' | 'disabled' | 'revoked';

export interface ApiKey {
  id: string;
  userId: string;
  status: ApiKeyStatus;
  label?: string | null;
}

export type IntensityLevel = 'soft' | 'medium' | 'high';

export interface GenerateRequest {
  mood: string;
  style: string;
  tempo: number;
  length: number;
  intensity?: IntensityLevel;
}

export interface TrackMetadata {
  id: string;
  userId: string;
  durationSeconds: number;
  mood: string;
  style: string;
  tempo: number;
  length: number;
  intensity: IntensityLevel;
  provider: 'openai';
  providerVersion?: string | null;
  plan: PlanType;
  watermarked: boolean;
  commercialLicense: boolean;
  storagePath: string;
  format: 'mp3' | 'wav';
  createdAt: Date;
}

export interface GenerateResponse {
  id: string;
  status: 'completed';
  downloadUrl: string;
  format: 'mp3';
  expiresIn: number;
  metadata: {
    tempo: number;
    mood: string;
    duration: number;
    style: string;
    intensity: IntensityLevel;
    provider: 'openai';
    plan: PlanType;
    watermarked: boolean;
    commercialLicense: boolean;
  };
  downloadUrlWav?: string;
  formatWav?: 'wav';
}
