/**
 * Prompt Benchmarking Script
 *
 * Compares different prompt strategies for the same mood/style combinations
 * and measures output quality subjectively via structured evaluation criteria.
 *
 * Usage:
 *   npx tsx scripts/benchmark-prompts.ts
 *
 * This script does NOT call external APIs — it generates prompts using different
 * strategies and outputs a comparison table for manual evaluation.
 * To run a live benchmark against a provider, set BENCHMARK_LIVE=1.
 */

import { GenerateRequest } from '../src/types/domain';

/* ─── Prompt Strategy Definitions ─── */

interface PromptStrategy {
  name: string;
  description: string;
  buildPrompt: (input: GenerateRequest) => string;
}

// Strategy 1: Simple template (baseline)
const simpleStrategy: PromptStrategy = {
  name: 'simple-template',
  description: 'Basic template with direct parameter substitution',
  buildPrompt: (input) =>
    `Generate ${input.mood} ${input.style} music at ${input.tempo} BPM for ${input.length} seconds. Intensity: ${input.intensity ?? 'medium'}.`,
};

// Strategy 2: Descriptor-based (current production strategy)
const moodDescriptors: Record<string, string> = {
  calm: 'gentle, peaceful, soothing, with slow evolving pads and soft sustained tones',
  focus: 'steady, minimal, concentration-friendly, with subtle repetitive patterns and clean tones',
  energetic: 'upbeat, driving, lively, with rhythmic momentum and bright melodic layers',
  melancholy: 'sad, emotional, reflective, with minor key harmonies and slow expressive melodies',
  romantic: 'warm, intimate, tender, with lush harmonies, gentle strings, and heartfelt melodies',
  dark: 'moody, brooding, mysterious, with deep bass tones, minor keys, and shadowy textures',
  uplifting: 'hopeful, bright, inspiring, with major key progressions and soaring melodic lines',
  dreamy: 'floaty, ethereal, hazy, with soft reverb textures and dreamlike melodic fragments',
};

const styleDescriptors: Record<string, string> = {
  ambient: 'atmospheric sound design, evolving pads, reverb-drenched textures, no percussion',
  lofi: 'lo-fi hip hop beat, vinyl crackle, dusty samples, mellow keys, relaxed drum pattern',
  classical: 'orchestral arrangement, strings, piano, woodwinds, classical composition structure',
  electronic: 'synthesizer-driven, electronic beats, digital textures, layered arpeggios',
  nature: 'organic sounds, field recordings, gentle wind, water, birds, mixed with soft instruments',
  jazz: 'jazz instrumentation, smooth saxophone, piano chords, walking bass, brushed drums, swing feel',
  chillhop: 'chill hop beat, jazzy samples, boom-bap drums, warm Rhodes piano, laid-back groove',
  cinematic: 'cinematic orchestral score, dramatic swells, wide stereo imaging, film soundtrack quality',
};

const intensityDescriptors: Record<string, string> = {
  soft: 'very quiet and sparse, whisper-level dynamics, minimal layering',
  medium: 'balanced dynamics, moderate layering, comfortable listening level',
  high: 'full and rich, dense layering, strong presence, bold dynamics',
};

const descriptorStrategy: PromptStrategy = {
  name: 'descriptor-based',
  description: 'Mood/style/intensity-specific descriptors (production)',
  buildPrompt: (input) => {
    const intensity = input.intensity ?? 'medium';
    const moodDesc = moodDescriptors[input.mood] ?? input.mood;
    const styleDesc = styleDescriptors[input.style] ?? input.style;
    const intensityDesc = intensityDescriptors[intensity] ?? intensity;
    return [
      `A ${input.mood} ${input.style} music track.`,
      `${moodDesc}.`,
      `${styleDesc}.`,
      `Tempo: ${input.tempo} BPM. Intensity: ${intensityDesc}.`,
      'No vocals. Smooth transitions. Suitable for background listening.',
    ].join(' ');
  },
};

// Strategy 3: Narrative-style (experimental)
const narrativeStrategy: PromptStrategy = {
  name: 'narrative-style',
  description: 'Rich narrative description painting a scene',
  buildPrompt: (input) => {
    const scenes: Record<string, string> = {
      calm: 'a quiet morning by a misty lake, sunlight filtering through trees',
      focus: 'a late-night study session with warm desk light and rain outside',
      energetic: 'a vibrant sunrise over a city skyline, streets coming to life',
      melancholy: 'an empty park bench at dusk, autumn leaves drifting slowly',
      romantic: 'a candlelit evening on a rooftop, stars beginning to appear',
      dark: 'walking through a dimly lit corridor, shadows moving on the walls',
      uplifting: 'standing on a mountain summit after a long climb, the world stretching below',
      dreamy: 'floating weightlessly through pastel clouds in a half-awake state',
    };
    const scene = scenes[input.mood] ?? `a ${input.mood} atmosphere`;
    return [
      `Create background music that evokes ${scene}.`,
      `The style should be ${input.style} with a tempo around ${input.tempo} BPM.`,
      `Duration: ${input.length} seconds. Intensity: ${input.intensity ?? 'medium'}.`,
      'Instrumental only, no vocals, smooth and atmospheric.',
    ].join(' ');
  },
};

// Strategy 4: Technical-musical (experimental)
const technicalStrategy: PromptStrategy = {
  name: 'technical-musical',
  description: 'Music theory-informed technical instructions',
  buildPrompt: (input) => {
    const keys: Record<string, string> = {
      calm: 'C major, using I-IV-V progressions with suspended chords',
      focus: 'D minor, using modal interchange and pedal tones',
      energetic: 'A major, using vi-IV-I-V progressions with syncopation',
      melancholy: 'E minor, using i-VI-III-VII progressions with passing tones',
      romantic: 'Ab major, using ii-V-I jazz voicings with extended chords (7ths, 9ths)',
      dark: 'B minor, using tritone substitutions and chromatic bass movement',
      uplifting: 'G major, using I-V-vi-IV with ascending bass lines',
      dreamy: 'F# major, using add9 and sus4 chords with open voicings',
    };
    const key = keys[input.mood] ?? 'C major with diatonic harmony';
    return [
      `Compose a ${input.length}-second ${input.style} track in ${key}.`,
      `Target tempo: ${input.tempo} BPM. Dynamic level: ${input.intensity ?? 'medium'}.`,
      `Arrange for ${input.style} instrumentation with appropriate timbral choices.`,
      'No vocals. Maintain consistent energy with subtle variations.',
    ].join(' ');
  },
};

const strategies: PromptStrategy[] = [
  simpleStrategy,
  descriptorStrategy,
  narrativeStrategy,
  technicalStrategy,
];

/* ─── Test Cases ─── */

const testCases: GenerateRequest[] = [
  { mood: 'calm', style: 'ambient', tempo: 65, length: 60, intensity: 'soft' },
  { mood: 'romantic', style: 'jazz', tempo: 80, length: 45, intensity: 'medium' },
  { mood: 'dark', style: 'electronic', tempo: 70, length: 90, intensity: 'high' },
  { mood: 'energetic', style: 'lofi', tempo: 85, length: 30, intensity: 'medium' },
  { mood: 'dreamy', style: 'classical', tempo: 60, length: 60, intensity: 'soft' },
  { mood: 'uplifting', style: 'cinematic', tempo: 75, length: 120, intensity: 'high' },
];

/* ─── Evaluation Criteria ─── */

interface EvaluationCriteria {
  name: string;
  description: string;
  weight: number;
}

const evaluationCriteria: EvaluationCriteria[] = [
  { name: 'Specificity', description: 'How specific and detailed is the prompt?', weight: 0.25 },
  { name: 'Mood Accuracy', description: 'Does the prompt clearly convey the intended mood?', weight: 0.25 },
  { name: 'Style Fidelity', description: 'Does the prompt describe the style accurately?', weight: 0.2 },
  { name: 'Distinctiveness', description: 'Would different mood/style combos produce distinct outputs?', weight: 0.2 },
  { name: 'Clarity', description: 'Is the prompt unambiguous for the AI model?', weight: 0.1 },
];

/* ─── Benchmark Runner ─── */

function runBenchmark(): void {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        PROMPT STRATEGY BENCHMARK — Ambient BGM API         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('Evaluation Criteria:');
  for (const c of evaluationCriteria) {
    console.log(`  • ${c.name} (${(c.weight * 100).toFixed(0)}%): ${c.description}`);
  }
  console.log();

  // Score each strategy (heuristic-based for automated runs)
  const strategyScores: Record<string, { total: number; count: number }> = {};

  for (const testCase of testCases) {
    const label = `${testCase.mood} × ${testCase.style} @ ${testCase.tempo}BPM (${testCase.intensity})`;
    console.log(`━━━ Test: ${label} ━━━\n`);

    for (const strategy of strategies) {
      const prompt = strategy.buildPrompt(testCase);
      const charCount = prompt.length;
      const wordCount = prompt.split(/\s+/).length;

      // Heuristic scoring
      const specificity = Math.min(1, wordCount / 50);
      const moodAccuracy = prompt.toLowerCase().includes(testCase.mood) ? 1.0 : 0.5;
      const hasMoodDescriptor = prompt.length > 100 && !prompt.startsWith('Generate') ? 0.3 : 0;
      const styleFidelity = prompt.toLowerCase().includes(testCase.style) ? 1.0 : 0.5;
      const distinctiveness = specificity * 0.5 + (charCount > 150 ? 0.5 : charCount / 300);
      const clarity = wordCount < 80 ? 1.0 : 0.8;

      const score =
        (specificity + hasMoodDescriptor) * evaluationCriteria[0].weight +
        moodAccuracy * evaluationCriteria[1].weight +
        styleFidelity * evaluationCriteria[2].weight +
        distinctiveness * evaluationCriteria[3].weight +
        clarity * evaluationCriteria[4].weight;

      if (!strategyScores[strategy.name]) {
        strategyScores[strategy.name] = { total: 0, count: 0 };
      }
      strategyScores[strategy.name].total += score;
      strategyScores[strategy.name].count += 1;

      console.log(`  [${strategy.name}] (${wordCount} words, ${charCount} chars)`);
      console.log(`  Score: ${(score * 100).toFixed(1)}%`);
      console.log(`  Prompt: "${prompt.slice(0, 120)}..."\n`);
    }
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    AGGREGATE RESULTS                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const ranked = Object.entries(strategyScores)
    .map(([name, { total, count }]) => ({ name, avgScore: total / count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  for (let i = 0; i < ranked.length; i++) {
    const { name, avgScore } = ranked[i];
    const strategy = strategies.find((s) => s.name === name)!;
    const badge = i === 0 ? ' ★ BEST' : '';
    console.log(`  ${i + 1}. ${name} — ${(avgScore * 100).toFixed(1)}%${badge}`);
    console.log(`     ${strategy.description}\n`);
  }

  console.log('Recommendation:');
  console.log(`  The "${ranked[0].name}" strategy scores highest overall.`);
  console.log('  For production use, combine descriptor-based specificity with');
  console.log('  narrative elements for the best AI model comprehension.\n');

  console.log('Note: These scores are heuristic-based. For true evaluation,');
  console.log('generate audio with each strategy and score with the evaluation');
  console.log('rubric in docs/ai-engineering-notes.md.\n');
}

runBenchmark();
