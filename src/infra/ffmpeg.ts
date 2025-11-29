import { spawn } from 'child_process';

import { AppError } from '../types/errors';
import { logger } from '../infra/logger';

export interface FfmpegPipelineParams {
  inputPath: string;
  outputMp3Path: string;
  outputWavPath?: string;
  applyWatermark: boolean;
  watermarkPath?: string;
  /** Approximate duration of the track in seconds (used to place watermark near the end). */
  durationSeconds?: number;
  /** Length of watermark tail in seconds (defaults to 4). */
  watermarkTailSeconds?: number;
}

export async function runFfmpegPipeline(params: FfmpegPipelineParams): Promise<void> {
  const args: string[] = ['-y'];

  if (!params.outputMp3Path && !params.outputWavPath) {
    throw new AppError('No output path provided for ffmpeg pipeline', 'provider_error', 500);
  }

  args.push('-i', params.inputPath);

  const useWatermark = params.applyWatermark && !!params.watermarkPath;

  if (useWatermark && params.watermarkPath) {
    args.push('-i', params.watermarkPath);
  }

  const filterComplexParts: string[] = [];

  if (useWatermark) {
    const durationSeconds = params.durationSeconds ?? 0;
    const tailSeconds = params.watermarkTailSeconds ?? 4;
    const offsetSeconds = Math.max(durationSeconds - tailSeconds, 0);
    const offsetMs = Math.round(offsetSeconds * 1000);

    filterComplexParts.push('[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[base]');
    filterComplexParts.push(`[1:a]adelay=${offsetMs}|${offsetMs}[wm_delayed]`);
    filterComplexParts.push('[base][wm_delayed]amix=inputs=2:duration=first:dropout_transition=0[aout]');
  } else {
    filterComplexParts.push('[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[aout]');
  }

  if (filterComplexParts.length > 0) {
    args.push('-filter_complex', filterComplexParts.join('; '));
  }

  if (params.outputMp3Path) {
    args.push('-map', '[aout]', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', params.outputMp3Path);
  }

  if (params.outputWavPath) {
    args.push('-map', '[aout]', '-vn', '-c:a', 'pcm_s16le', params.outputWavPath);
  }

  await new Promise<void>((resolve, reject) => {
    logger.debug({ args }, 'Starting ffmpeg pipeline');
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', (err) => {
      logger.error({ err, args }, 'Failed to start ffmpeg');
      reject(new AppError(`Failed to start ffmpeg: ${err.message}`, 'provider_error', 500));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = stderr
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .slice(-5)
          .join('\n');
        const message = tail ? `ffmpeg exited with code ${code}: ${tail}` : `ffmpeg exited with code ${code}`;
        logger.error({ code, stderrTail: tail, args }, 'ffmpeg process exited with error');
        reject(new AppError(message, 'provider_error', 500));
      }
    });
  });
}
