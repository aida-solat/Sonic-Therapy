export interface AudioProviderGenerateParams {
  prompt: string;
  tempo: number;
  lengthSeconds: number;
}

export interface AudioProviderGenerateResult {
  tempFilePath: string;
  format: 'wav' | 'mp3';
  providerVersion?: string | null;
}

export interface AudioProvider {
  generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult>;
}
