export type PlanType = 'free' | 'basic' | 'pro' | 'ultra';
export type IntensityLevel = 'soft' | 'medium' | 'high';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export interface MeResponse {
  userId: string;
  plan: PlanType;
  dailyQuota: number;
  usedToday: number;
  remainingToday: number;
}

export interface AccountMeResponse extends MeResponse {
  email: string;
  stripeCustomerId?: string | null;
  hasBillingCustomer: boolean;
}

export interface CreateApiKeyResponse {
  id: string;
  apiKey: string;
  label?: string | null;
  createdAt?: string;
}

export interface AccountApiKeyItem {
  id: string;
  label?: string | null;
  status: 'active' | 'disabled' | 'revoked';
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface AccountApiKeysResponse {
  items: AccountApiKeyItem[];
}

export interface GenerateRequest {
  mood: string;
  style: string;
  tempo: number;
  length: number;
  intensity?: IntensityLevel;
}

export interface GenerateResponse {
  id: string;
  status: 'completed';
  downloadUrl: string;
  format: 'mp3';
  expiresIn: number;
  downloadUrlWav?: string;
  formatWav?: 'wav';
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
}

export interface HealthCheck {
  status: 'ok' | 'error';
  error?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'ok';
  checks?: {
    database?: HealthCheck;
    storage?: HealthCheck;
    provider?: HealthCheck;
  };
  db?: { status: 'ok' | 'error'; error?: string };
  storage?: { status: 'ok' | 'error'; error?: string };
  provider?: { status: 'ok' | 'error'; error?: string };
}

export type AudioAnalysisStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export type AudioAnalysisRecommendation = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface AudioAnalysisResult {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  tempoBpm: number;
  bpmError?: number | null;
  keyEstimate: string;
  harmonicPercussiveRatio: number;
  spectral: {
    spectralCentroidHz: number;
    spectralBandwidthHz: number;
    spectralRolloffHz: number;
    zeroCrossingRate: number;
  };
  dynamics: {
    rmsMean: number;
    rmsStd: number;
    dynamicRangeDb: number;
  };
  therapy: {
    subBassEnergyRatio: number;
    lowFrequencyEnergyRatio: number;
    highFrequencyEnergyRatio: number;
  };
  therapyFitScore: number;
  recommendation: AudioAnalysisRecommendation;
}

export interface AccountTrackItem {
  id: string;
  format: 'mp3' | 'wav';
  createdAt: string;
  downloadUrl: string;
  downloadUrlWav?: string;
  formatWav?: 'wav';
  trackType?: 'standard' | 'therapy';
  therapyFrequency?: { band: string; hz: number; solfeggioHz?: number; label: string } | null;
  audioAnalysis?: AudioAnalysisResult | null;
  audioAnalysisScore?: number | null;
  audioAnalysisStatus?: AudioAnalysisStatus;
  audioAnalysisAt?: string | null;
  metadata: {
    tempo: number;
    mood: string;
    duration: number;
    style: string;
    intensity: IntensityLevel;
    provider: 'openai';
    providerVersion?: string | null;
    plan: PlanType;
    watermarked: boolean;
    commercialLicense: boolean;
  };
}

export interface AccountTracksResponse {
  items: AccountTrackItem[];
}

export interface RevealedKey extends CreateApiKeyResponse {
  savedAt: string;
}

export interface BillingSessionResponse {
  url: string;
}

/* ─── Therapy Types ─── */

export type TherapyGoal =
  | 'pain_relief'
  | 'emotion_relief'
  | 'deep_sleep'
  | 'anti_aging'
  | 'healing'
  | 'rem_sleep'
  | 'deep_relaxation'
  | 'meditation'
  | 'creativity'
  | 'relaxed_focus'
  | 'stress_reduction'
  | 'positive_thinking'
  | 'fast_learning'
  | 'focused_attention'
  | 'cognitive_thinking'
  | 'problem_solving'
  | 'active_lifestyle'
  | 'high_cognition'
  | 'memory_recall'
  | 'peak_awareness';

export type BodyArea =
  | 'abdominal'
  | 'back'
  | 'chest'
  | 'chronic'
  | 'groin'
  | 'head'
  | 'hip'
  | 'joint'
  | 'knee'
  | 'leg'
  | 'muscle'
  | 'nerve'
  | 'painful_sex'
  | 'penis_pain'
  | 'period'
  | 'shoulder';

export type EmotionTarget =
  | 'anger'
  | 'guilt'
  | 'shame'
  | 'depression'
  | 'annoyance'
  | 'hurt'
  | 'hostility'
  | 'fear'
  | 'anxiety'
  | 'loneliness'
  | 'boredom'
  | 'embarrassment'
  | 'envy'
  | 'contempt'
  | 'despair'
  | 'sadness'
  | 'disgust'
  | 'disappointment'
  | 'frustration'
  | 'hate'
  | 'jealousy'
  | 'pride'
  | 'surprise'
  | 'confusion';

export type CulturalMode = 'chinese_five_element' | 'indian_raga' | 'ottoman_maqam';

export interface TherapyFrequencyTarget {
  band: string;
  hz: number;
  solfeggioHz?: number;
  label: string;
}

export interface TherapyRequest {
  goal: TherapyGoal;
  genre: string;
  bodyArea?: BodyArea;
  emotion?: EmotionTarget;
  culturalMode?: CulturalMode;
  durationSeconds: number;
  intensity?: IntensityLevel;
}

/* ─── Track Rating Types ─── */

export interface TrackRatingRequest {
  satisfaction: number;
  moodAccuracy: number;
  styleAccuracy: number;
  audioQuality: number;
  comment?: string;
}

export interface TrackEvaluationSummary {
  trackId: string;
  avgSatisfaction: number;
  avgMoodAccuracy: number;
  avgStyleAccuracy: number;
  avgAudioQuality: number;
  overallScore: number;
  totalRatings: number;
}

export interface TherapyResponse {
  id: string;
  status: 'completed';
  downloadUrl: string;
  format: 'mp3';
  expiresIn: number;
  metadata: {
    goal: TherapyGoal;
    genre: string;
    bodyArea?: BodyArea;
    emotion?: EmotionTarget;
    duration: number;
    intensity: IntensityLevel;
    frequency: TherapyFrequencyTarget;
    culturalMode?: CulturalMode;
    provider: string;
    plan: PlanType;
    watermarked: boolean;
    commercialLicense: boolean;
  };
  downloadUrlWav?: string;
  formatWav?: 'wav';
}
