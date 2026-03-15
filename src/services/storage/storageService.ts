export interface UploadTrackParams {
  userId: string;
  trackId: string;
  localFilePath: string;
  format: 'mp3' | 'wav';
}

export interface GetDownloadUrlParams {
  storagePath: string;
  expiresInSeconds: number;
}

export interface StorageService {
  uploadTrack(params: UploadTrackParams): Promise<{ storagePath: string; contentType: string }>;
  getDownloadUrl(params: GetDownloadUrlParams): Promise<string>;
  deleteTrack(storagePaths: string[]): Promise<void>;
}
