import { spawn } from 'child_process';

import { AppError } from '../../types/errors';
import { logger } from '../../infra/logger';
import { TherapyFrequencyTarget } from '../../types/domain';
import { SessionPhase } from './frequencyMappingService';

export interface BinauralMixParams {
  /** Path to the AI-generated music file. */
  musicPath: string;
  /** Output MP3 path. */
  outputMp3Path: string;
  /** Optional output WAV path. */
  outputWavPath?: string;
  /** Target therapy frequency. */
  frequency: TherapyFrequencyTarget;
  /** Session phases with frequency ramping. */
  phases: SessionPhase[];
  /** Track duration in seconds. */
  durationSeconds: number;
  /** Volume of the binaural tone relative to the music (0.0–1.0). Defaults to 0.15. */
  binauralVolume?: number;
  /** Volume of the solfeggio tone relative to the music (0.0–1.0). Defaults to 0.08. */
  solfeggioVolume?: number;
  /** Apply watermark. */
  applyWatermark: boolean;
  /** Watermark file path. */
  watermarkPath?: string;
  /** Watermark tail in seconds. */
  watermarkTailSeconds?: number;
}

/**
 * Binaural Beat Mixing Pipeline — Phase-Aware with Frequency Ramping
 *
 * Generates a binaural beat with three session phases:
 *   Induction  — ramp from alert state down to target frequency
 *   Deepening  — hold the core therapeutic frequency
 *   Emergence  — gently ramp back toward an alert state
 *
 * Within each phase, the binaural beat frequency smoothly sweeps between
 * startHz and endHz using ffmpeg's aevalsrc with linear interpolation.
 *
 * The binaural beat is created as a stereo signal:
 *   - Left ear:  carrier (200 Hz)
 *   - Right ear: carrier + beatHz(t)  where beatHz(t) ramps over time
 *
 * Solfeggio tones are only active during the deepening phase.
 *
 * Carrier frequency is set to 200 Hz — low enough to be unobtrusive,
 * high enough for headphones to reproduce accurately.
 */
export async function runBinauralMixPipeline(params: BinauralMixParams): Promise<void> {
  const {
    musicPath,
    outputMp3Path,
    outputWavPath,
    frequency,
    phases,
    durationSeconds,
    binauralVolume = 0.15,
    solfeggioVolume = 0.08,
    applyWatermark,
    watermarkPath,
    watermarkTailSeconds = 4,
  } = params;

  const carrierHz = 200;
  const sampleRate = 44100;

  const args: string[] = ['-y'];

  // Input 0: music file
  args.push('-i', musicPath);

  // Build phase timeline — absolute start/end times
  const phaseTimeline: {
    start: number;
    end: number;
    startHz: number;
    endHz: number;
    solfeggioHz?: number;
  }[] = [];
  let cursor = 0;
  for (const phase of phases) {
    const phaseDur = Math.round(durationSeconds * phase.fraction);
    phaseTimeline.push({
      start: cursor,
      end: cursor + phaseDur,
      startHz: phase.startHz,
      endHz: phase.endHz,
      solfeggioHz: phase.solfeggioHz,
    });
    cursor += phaseDur;
  }
  // Adjust last phase to cover exact duration
  if (phaseTimeline.length > 0) {
    phaseTimeline[phaseTimeline.length - 1].end = durationSeconds;
  }

  // Build a piecewise-linear beat frequency expression: beatHz(t)
  // This creates smooth transitions between phases
  const beatExprParts: string[] = [];
  for (let i = 0; i < phaseTimeline.length; i++) {
    const p = phaseTimeline[i];
    const dur = p.end - p.start;
    if (dur <= 0) continue;
    // Linear interpolation: startHz + (endHz - startHz) * (t - start) / dur
    const slope = dur > 0 ? (p.endHz - p.startHz) / dur : 0;
    const expr = `if(between(t,${p.start},${p.end}), ${p.startHz} + ${slope}*(t-${p.start})`;
    beatExprParts.push(expr);
  }
  // Nest the if() expressions and close parens; fallback to target Hz
  let beatExpr = String(frequency.hz);
  for (let i = beatExprParts.length - 1; i >= 0; i--) {
    beatExpr = `${beatExprParts[i]}, ${beatExpr})`;
  }

  // Input 1: binaural stereo signal via aevalsrc (left = carrier, right = carrier + beatHz(t))
  const leftExpr = `sin(2*PI*${carrierHz}*t)`;
  const rightExpr = `sin(2*PI*(${carrierHz}+(${beatExpr}))*t)`;
  const binauralSrc = `aevalsrc='${leftExpr}|${rightExpr}':s=${sampleRate}:d=${durationSeconds}:c=stereo`;
  args.push('-f', 'lavfi', '-i', binauralSrc);

  // Input 2 (optional): solfeggio tone — only during deepening phase
  const deepeningPhase = phaseTimeline.find(
    (p) =>
      phases[phaseTimeline.indexOf(p)]?.name === 'deepening' && p.solfeggioHz && p.solfeggioHz > 0,
  );
  const hasSolfeggio = !!deepeningPhase?.solfeggioHz;
  if (hasSolfeggio && deepeningPhase) {
    const solDur = deepeningPhase.end - deepeningPhase.start;
    args.push(
      '-f',
      'lavfi',
      '-t',
      String(solDur),
      '-i',
      `sine=frequency=${deepeningPhase.solfeggioHz}:duration=${solDur}`,
    );
  }

  // Input N (optional): watermark
  const useWatermark = applyWatermark && !!watermarkPath;
  if (useWatermark && watermarkPath) {
    args.push('-i', watermarkPath);
  }

  const needsBothOutputs = !!outputMp3Path && !!outputWavPath;

  // Build filter_complex
  const fc: string[] = [];

  // Normalize music
  fc.push('[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[music]');

  // Volume-adjust the binaural stereo signal
  fc.push(`[1:a]volume=${binauralVolume}[binaural]`);

  // Mix music + binaural
  let currentMix = 'mix1';
  fc.push(`[music][binaural]amix=inputs=2:duration=first:dropout_transition=0[${currentMix}]`);

  // Mix in solfeggio during deepening phase (delayed to start at deepening onset)
  if (hasSolfeggio && deepeningPhase) {
    const solInput = useWatermark ? '2' : '2';
    const delayMs = Math.round(deepeningPhase.start * 1000);
    fc.push(`[${solInput}:a]volume=${solfeggioVolume},adelay=${delayMs}|${delayMs}[solfeggio]`);
    const nextMix = 'mix2';
    fc.push(
      `[${currentMix}][solfeggio]amix=inputs=2:duration=first:dropout_transition=0[${nextMix}]`,
    );
    currentMix = nextMix;
  }

  // Watermark overlay
  if (useWatermark) {
    const wmInput = hasSolfeggio ? '3' : '2';
    const offsetSeconds = Math.max(durationSeconds - watermarkTailSeconds, 0);
    const offsetMs = Math.round(offsetSeconds * 1000);
    fc.push(`[${wmInput}:a]adelay=${offsetMs}|${offsetMs}[wm_delayed]`);
    const nextMix = 'mix_wm';
    fc.push(
      `[${currentMix}][wm_delayed]amix=inputs=2:duration=first:dropout_transition=0[${nextMix}]`,
    );
    currentMix = nextMix;
  }

  // Fade-in / fade-out for professional start and end
  const fadeIn = 3;
  const fadeOut = 4;
  const fadeOutStart = Math.max(durationSeconds - fadeOut, 0);
  fc.push(
    `[${currentMix}]afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[faded]`,
  );

  // Split for dual output if needed
  if (needsBothOutputs) {
    fc.push('[faded]asplit=2[aout_mp3][aout_wav]');
  } else {
    fc.push('[faded]acopy[aout]');
  }

  args.push('-filter_complex', fc.join('; '));

  // Output MP3
  if (outputMp3Path) {
    const mapLabel = needsBothOutputs ? '[aout_mp3]' : '[aout]';
    args.push('-map', mapLabel, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', outputMp3Path);
  }

  // Output WAV
  if (outputWavPath) {
    const mapLabel = needsBothOutputs ? '[aout_wav]' : '[aout]';
    args.push('-map', mapLabel, '-vn', '-c:a', 'pcm_s16le', outputWavPath);
  }

  await new Promise<void>((resolve, reject) => {
    logger.debug(
      {
        binauralHz: frequency.hz,
        carrierHz,
        solfeggioHz: frequency.solfeggioHz,
        band: frequency.band,
        phases: phases.map(
          (p) => `${p.name}: ${p.startHz}→${p.endHz} Hz (${Math.round(p.fraction * 100)}%)`,
        ),
      },
      'Starting phase-aware binaural mix pipeline',
    );
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', (err) => {
      logger.error({ err, args }, 'Failed to start binaural mix ffmpeg');
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
        const message = tail
          ? `ffmpeg binaural mix exited with code ${code}: ${tail}`
          : `ffmpeg binaural mix exited with code ${code}`;
        logger.error({ code, stderrTail: tail }, 'Binaural mix ffmpeg exited with error');
        reject(new AppError(message, 'provider_error', 500));
      }
    });
  });
}
