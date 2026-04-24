export type PlanType = 'free' | 'basic' | 'pro' | 'ultra';

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

export type FrequencyBand = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';

export interface TherapyFrequencyTarget {
  band: FrequencyBand;
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

export type AudioAnalysisStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export type AudioAnalysisRecommendation = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface AudioAnalysisSpectral {
  spectralCentroidHz: number;
  spectralBandwidthHz: number;
  spectralRolloffHz: number;
  zeroCrossingRate: number;
}

export interface AudioAnalysisDynamics {
  rmsMean: number;
  rmsStd: number;
  dynamicRangeDb: number;
}

export interface AudioAnalysisTherapy {
  subBassEnergyRatio: number;
  lowFrequencyEnergyRatio: number;
  highFrequencyEnergyRatio: number;
}

export interface AudioAnalysisResult {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  tempoBpm: number;
  bpmError?: number | null;
  keyEstimate: string;
  harmonicPercussiveRatio: number;
  spectral: AudioAnalysisSpectral;
  dynamics: AudioAnalysisDynamics;
  therapy: AudioAnalysisTherapy;
  therapyFitScore: number;
  recommendation: AudioAnalysisRecommendation;
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
  wavStoragePath?: string | null;
  format: 'mp3' | 'wav';
  trackType: 'standard' | 'therapy';
  therapyFrequency?: { band: string; hz: number; solfeggioHz?: number; label: string } | null;
  audioAnalysis?: AudioAnalysisResult | null;
  audioAnalysisScore?: number | null;
  audioAnalysisStatus?: AudioAnalysisStatus;
  audioAnalysisAt?: Date | null;
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
