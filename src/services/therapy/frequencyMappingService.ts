import {
  TherapyGoal,
  BodyArea,
  EmotionTarget,
  FrequencyBand,
  TherapyFrequencyTarget,
} from '../../types/domain';

/* ─── Brainwave Band Ranges ─── */

const bandRanges: Record<FrequencyBand, { min: number; max: number; label: string }> = {
  delta: { min: 0.1, max: 4, label: 'Deep sleep & healing' },
  theta: { min: 4, max: 8, label: 'REM sleep, deep relaxation & meditation' },
  alpha: { min: 8, max: 13, label: 'Relaxed focus & stress reduction' },
  beta: { min: 13, max: 30, label: 'Focused attention & cognitive thinking' },
  gamma: { min: 30, max: 50, label: 'High-level cognition & peak awareness' },
};

/* ─── Solfeggio Frequencies ─── */

const solfeggioMap: Record<number, string> = {
  174: 'Pain reduction, sense of security',
  285: 'Tissue healing, cellular regeneration',
  396: 'Liberation from guilt and fear',
  417: 'Clearing negative energy, facilitating change',
  528: 'DNA repair, transformation, miracles',
  639: 'Harmonizing relationships, communication',
  741: 'Awakening intuition, creative expression',
  852: 'Spiritual order, inner wisdom',
  963: 'Higher consciousness, spiritual connection',
};

/* ─── Goal → Frequency Mapping ─── */

const goalFrequencyMap: Record<TherapyGoal, TherapyFrequencyTarget> = {
  pain_relief: {
    band: 'delta',
    hz: 2,
    solfeggioHz: 174,
    label: 'Pain relief — delta 2 Hz + 174 Hz Solfeggio',
  },
  deep_sleep: { band: 'delta', hz: 1, label: 'Deep sleep — delta 1 Hz' },
  anti_aging: {
    band: 'delta',
    hz: 3,
    solfeggioHz: 285,
    label: 'Anti-aging — delta 3 Hz + 285 Hz tissue healing',
  },
  healing: {
    band: 'delta',
    hz: 2.5,
    solfeggioHz: 528,
    label: 'Healing — delta 2.5 Hz + 528 Hz DNA repair',
  },
  rem_sleep: { band: 'theta', hz: 5, label: 'REM sleep — theta 5 Hz' },
  deep_relaxation: {
    band: 'theta',
    hz: 6,
    solfeggioHz: 285,
    label: 'Deep relaxation — theta 6 Hz + 285 Hz',
  },
  meditation: {
    band: 'theta',
    hz: 7,
    solfeggioHz: 852,
    label: 'Meditation — theta 7 Hz + 852 Hz inner wisdom',
  },
  creativity: {
    band: 'theta',
    hz: 7.5,
    solfeggioHz: 741,
    label: 'Creativity — theta 7.5 Hz + 741 Hz creative expression',
  },
  relaxed_focus: { band: 'alpha', hz: 10, label: 'Relaxed focus — alpha 10 Hz' },
  stress_reduction: {
    band: 'alpha',
    hz: 7.83,
    solfeggioHz: 396,
    label: 'Stress reduction — Schumann resonance 7.83 Hz + 396 Hz liberation',
  },
  positive_thinking: {
    band: 'alpha',
    hz: 10,
    solfeggioHz: 639,
    label: 'Positive thinking — alpha 10 Hz + 639 Hz harmony',
  },
  fast_learning: { band: 'alpha', hz: 12, label: 'Fast learning — alpha 12 Hz' },
  focused_attention: { band: 'beta', hz: 15, label: 'Focused attention — beta 15 Hz' },
  cognitive_thinking: { band: 'beta', hz: 20, label: 'Cognitive thinking — beta 20 Hz' },
  problem_solving: {
    band: 'beta',
    hz: 25,
    solfeggioHz: 741,
    label: 'Problem solving — beta 25 Hz + 741 Hz intuition',
  },
  active_lifestyle: { band: 'beta', hz: 20, label: 'Active lifestyle — beta 20 Hz' },
  high_cognition: {
    band: 'gamma',
    hz: 40,
    solfeggioHz: 963,
    label: 'High cognition — gamma 40 Hz + 963 Hz higher consciousness',
  },
  memory_recall: { band: 'gamma', hz: 40, label: 'Memory recall — gamma 40 Hz' },
  peak_awareness: {
    band: 'gamma',
    hz: 40,
    solfeggioHz: 852,
    label: 'Peak awareness — gamma 40 Hz + 852 Hz spiritual order',
  },
  emotion_relief: {
    band: 'theta',
    hz: 6,
    solfeggioHz: 396,
    label: 'Emotion relief — theta 6 Hz + 396 Hz emotional healing',
  },
};

/* ─── Goal → Smart Tempo (BPM) ─── */

const goalTempoMap: Record<TherapyGoal, number> = {
  // Delta goals — slowest tempos (55-62 BPM) for deep rest
  pain_relief: 58,
  deep_sleep: 55,
  anti_aging: 60,
  healing: 58,
  // Theta goals — slow tempos (60-68 BPM) for relaxation/meditation
  rem_sleep: 60,
  deep_relaxation: 62,
  meditation: 65,
  creativity: 68,
  // Alpha goals — moderate tempos (68-78 BPM) for calm focus
  relaxed_focus: 72,
  stress_reduction: 68,
  positive_thinking: 70,
  fast_learning: 75,
  // Beta goals — higher tempos (78-95 BPM) for active cognition
  focused_attention: 80,
  cognitive_thinking: 85,
  problem_solving: 82,
  active_lifestyle: 95,
  // Gamma goals — elevated tempos (88-100 BPM) for peak performance
  high_cognition: 90,
  memory_recall: 88,
  peak_awareness: 92,
  // Emotion relief — moderate calm (65 BPM)
  emotion_relief: 65,
};

/* ─── Emotion → Solfeggio Refinement ─── */

const emotionSolfeggioMap: Partial<Record<EmotionTarget, number>> = {
  anger: 396,
  guilt: 396,
  shame: 396,
  fear: 396,
  anxiety: 285,
  depression: 528,
  sadness: 528,
  despair: 528,
  loneliness: 639,
  frustration: 417,
  hate: 417,
  hostility: 417,
  confusion: 741,
  embarrassment: 639,
  envy: 417,
  jealousy: 417,
  contempt: 417,
  boredom: 741,
  hurt: 528,
  annoyance: 285,
  disappointment: 528,
  disgust: 417,
  pride: 741,
  surprise: 285,
};

/* ─── Body Area → Hz Refinement (pain relief context) ─── */

const bodyAreaHzMap: Partial<Record<BodyArea, number>> = {
  head: 1,
  chronic: 2,
  nerve: 1,
  back: 2,
  muscle: 30,
  joint: 2.5,
  shoulder: 2.5,
  knee: 2.5,
  hip: 2.5,
  leg: 2,
  chest: 3,
  abdominal: 3,
  period: 2,
  groin: 2,
  painful_sex: 2,
  penis_pain: 2,
};

/* ─── Session Phase Entrainment Ramps ─── */

export interface SessionPhase {
  name: 'induction' | 'deepening' | 'emergence';
  /** Fraction of total duration (0–1). All three must sum to 1. */
  fraction: number;
  /** Binaural beat Hz at the START of this phase. */
  startHz: number;
  /** Binaural beat Hz at the END of this phase. */
  endHz: number;
  /** Solfeggio Hz for this phase (may differ from core). */
  solfeggioHz?: number;
}

/**
 * Builds a 3-phase entrainment ramp for a given goal.
 *
 * Induction  (15%): Start from a more alert brainwave state and ramp down
 *                    toward the target — eases the listener in.
 * Deepening  (70%): Hold the core target frequency for therapeutic effect.
 * Emergence  (15%): Gently ramp back up toward a light alpha state
 *                    so the listener doesn’t feel jarred when the track ends.
 */
function buildSessionPhases(frequency: TherapyFrequencyTarget): SessionPhase[] {
  const targetHz = frequency.hz;
  const band = frequency.band;

  // Induction start: one band "above" the target (more alert)
  const inductionStartHz =
    band === 'delta'
      ? 8 // start from alpha
      : band === 'theta'
        ? 10 // start from mid-alpha
        : band === 'alpha'
          ? 13 // start from low-beta
          : band === 'beta'
            ? 13 // start from alpha edge
            : /* gamma */ 20; // start from beta

  // Emergence end: light alpha for gentle return
  const emergenceEndHz =
    band === 'gamma'
      ? 20 // beta for gamma users
      : band === 'beta'
        ? 12
        : 10; // alpha baseline for everyone else

  return [
    {
      name: 'induction',
      fraction: 0.15,
      startHz: inductionStartHz,
      endHz: targetHz,
      solfeggioHz: undefined, // no solfeggio during induction
    },
    {
      name: 'deepening',
      fraction: 0.7,
      startHz: targetHz,
      endHz: targetHz,
      solfeggioHz: frequency.solfeggioHz,
    },
    {
      name: 'emergence',
      fraction: 0.15,
      startHz: targetHz,
      endHz: emergenceEndHz,
      solfeggioHz: undefined, // fade out solfeggio
    },
  ];
}

/* ─── Public Service ─── */

export interface FrequencyMappingService {
  resolve(goal: TherapyGoal, emotion?: EmotionTarget, bodyArea?: BodyArea): TherapyFrequencyTarget;
  getSmartTempo(goal: TherapyGoal): number;
  resolveSessionPhases(frequency: TherapyFrequencyTarget): SessionPhase[];
  getBandInfo(band: FrequencyBand): { min: number; max: number; label: string };
  getSolfeggioLabel(hz: number): string | undefined;
}

export const frequencyMappingService: FrequencyMappingService = {
  resolve(goal: TherapyGoal, emotion?: EmotionTarget, bodyArea?: BodyArea): TherapyFrequencyTarget {
    const base = { ...goalFrequencyMap[goal] };

    // Refine solfeggio based on specific emotion
    if (goal === 'emotion_relief' && emotion) {
      const emotionSolfeggio = emotionSolfeggioMap[emotion];
      if (emotionSolfeggio) {
        base.solfeggioHz = emotionSolfeggio;
        base.label =
          `Emotion relief (${emotion}) — theta ${base.hz} Hz + ${emotionSolfeggio} Hz ${solfeggioMap[emotionSolfeggio] ?? ''}`.trim();
      }
    }

    // Refine binaural frequency based on body area for pain relief
    if (goal === 'pain_relief' && bodyArea) {
      const areaHz = bodyAreaHzMap[bodyArea];
      if (areaHz) {
        base.hz = areaHz;
        base.label = `Pain relief (${bodyArea}) — delta ${areaHz} Hz + ${base.solfeggioHz ?? 174} Hz Solfeggio`;
      }
    }

    return base;
  },

  getSmartTempo(goal: TherapyGoal): number {
    return goalTempoMap[goal];
  },

  resolveSessionPhases(frequency: TherapyFrequencyTarget): SessionPhase[] {
    return buildSessionPhases(frequency);
  },

  getBandInfo(band: FrequencyBand) {
    return bandRanges[band];
  },

  getSolfeggioLabel(hz: number): string | undefined {
    return solfeggioMap[hz];
  },
};
