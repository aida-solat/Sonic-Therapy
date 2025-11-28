import { spawn } from 'child_process';

export interface FfmpegPipelineParams {
  inputPath: string;
  outputPath: string;
  outputFormat: 'mp3' | 'wav';
  applyWatermark: boolean;
  watermarkPath?: string;
}

export async function runFfmpegPipeline(params: FfmpegPipelineParams): Promise<void> {
  const args: string[] = [];

  if (params.applyWatermark && params.watermarkPath) {
    args.push(
      '-y',
      '-i',
      params.inputPath,
      '-i',
      params.watermarkPath,
      '-filter_complex',
      '[0:a][1:a]amix=inputs=2:duration=shortest:dropout_transition=0'
    );
  } else {
    args.push('-y', '-i', params.inputPath);
  }

  if (params.outputFormat === 'mp3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', '192k', params.outputPath);
  } else {
    args.push('-vn', '-c:a', 'pcm_s16le', params.outputPath);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args);

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}
