import { describe, it, expect, vi, beforeEach } from 'vitest';

import { supabaseStorageService } from '../src/services/storage/supabaseStorageService';
import { supabaseClient } from '../src/infra/supabaseClient';
import { AppError } from '../src/types/errors';

const { readFileMock, uploadMock, fromMock } = vi.hoisted(() => {
  const readFileMock = vi.fn();
  const uploadMock = vi.fn();
  const fromMock = vi.fn(() => ({ upload: uploadMock }));
  return { readFileMock, uploadMock, fromMock };
});

vi.mock('fs/promises', () => ({
  default: {
    readFile: readFileMock
  }
}));

describe('supabaseStorageService.uploadTrack', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    uploadMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation(() => ({ upload: uploadMock }));
    (supabaseClient as any).storage = {
      from: fromMock
    };
  });

  it('uploads track successfully with correct storagePath and contentType (mp3)', async () => {
    readFileMock.mockResolvedValueOnce(Buffer.from('test-data'));
    uploadMock.mockResolvedValueOnce({ error: null });

    const result = await supabaseStorageService.uploadTrack({
      userId: 'user-123',
      trackId: 'track-456',
      localFilePath: '/tmp/file.mp3',
      format: 'mp3'
    });

    expect(readFileMock).toHaveBeenCalledWith('/tmp/file.mp3');
    expect(fromMock).toHaveBeenCalledWith('tracks');
    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [storagePathArg, fileDataArg, optionsArg] = uploadMock.mock.calls[0];
    expect(storagePathArg).toBe('tracks/user-123/track-456.mp3');
    expect(Buffer.isBuffer(fileDataArg)).toBe(true);
    expect(optionsArg).toMatchObject({ upsert: true, contentType: 'audio/mpeg' });

    expect(result).toEqual({
      storagePath: 'tracks/user-123/track-456.mp3',
      contentType: 'audio/mpeg'
    });
  });

  it('throws storage_error when local file is missing', async () => {
    readFileMock.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(
      supabaseStorageService.uploadTrack({
        userId: 'user-123',
        trackId: 'track-456',
        localFilePath: '/tmp/missing.mp3',
        format: 'mp3'
      })
    ).rejects.toMatchObject({ code: 'storage_error', statusCode: 500 } as Partial<AppError>);

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('throws storage_error when Supabase upload fails', async () => {
    readFileMock.mockResolvedValueOnce(Buffer.from('test-data'));
    uploadMock.mockResolvedValueOnce({ error: { message: 'upload failed' } });

    await expect(
      supabaseStorageService.uploadTrack({
        userId: 'user-123',
        trackId: 'track-456',
        localFilePath: '/tmp/file.wav',
        format: 'wav'
      })
    ).rejects.toMatchObject({ code: 'storage_error', statusCode: 500 } as Partial<AppError>);

    expect(fromMock).toHaveBeenCalledWith('tracks');
    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [storagePathArg, _fileDataArg, optionsArg] = uploadMock.mock.calls[0];
    expect(storagePathArg).toBe('tracks/user-123/track-456.wav');
    expect(optionsArg).toMatchObject({ upsert: true, contentType: 'audio/wav' });
  });
});
