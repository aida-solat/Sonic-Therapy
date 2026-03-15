import fs from 'fs/promises';

import { supabaseClient } from '../../infra/supabaseClient';
import { AppError } from '../../types/errors';
import { logger } from '../../infra/logger';

import { StorageService, UploadTrackParams, GetDownloadUrlParams } from './storageService';

const BUCKET_NAME = 'tracks';

export const supabaseStorageService: StorageService = {
  async uploadTrack(
    params: UploadTrackParams,
  ): Promise<{ storagePath: string; contentType: string }> {
    const storagePath = `tracks/${params.userId}/${params.trackId}.${params.format}`;

    let fileData: Buffer;
    try {
      fileData = await fs.readFile(params.localFilePath);
    } catch {
      throw new AppError('Failed to read local file for upload', 'storage_error', 500);
    }

    const contentType = params.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

    const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(storagePath, fileData, {
      upsert: true,
      contentType,
    });

    if (error) {
      logger.error(
        { err: error, storagePath, bucket: BUCKET_NAME },
        'Supabase storage upload failed',
      );
      throw new AppError(`Failed to upload track: ${error.message}`, 'storage_error', 500);
    }

    return { storagePath, contentType };
  },

  async getDownloadUrl(params: GetDownloadUrlParams): Promise<string> {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(params.storagePath, params.expiresInSeconds);

    if (error || !data?.signedUrl) {
      logger.error(
        { err: error, storagePath: params.storagePath },
        'Supabase signed URL creation failed',
      );
      throw new AppError(
        `Failed to create signed URL: ${error?.message ?? 'no URL returned'}`,
        'storage_error',
        500,
      );
    }

    return data.signedUrl;
  },
};
