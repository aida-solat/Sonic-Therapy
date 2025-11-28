export interface AudioProviderGenerateParams {
  prompt: string;
  tempo: number;
  lengthSeconds: number;
}

export interface AudioProviderGenerateResult {
  tempFilePath: string;
  format: 'wav' | 'mp3';
}

export interface AudioProvider {
  generateTrack(params: AudioProviderGenerateParams): Promise<AudioProviderGenerateResult>;
}
