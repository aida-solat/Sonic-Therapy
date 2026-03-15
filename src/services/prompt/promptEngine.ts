import { GenerateRequest } from '../../types/domain';
import { promptRetrievalService } from './promptRetrieval';

export interface PromptPayload {
  prompt: string;
}

export interface PromptEngine {
  buildPrompt(input: GenerateRequest): PromptPayload;
}

const moodDescriptors: Record<string, string> = {
  calm: 'gentle, peaceful, soothing, with slow evolving pads and soft sustained tones',
  focus: 'steady, minimal, concentration-friendly, with subtle repetitive patterns and clean tones',
  energetic: 'upbeat, driving, lively, with rhythmic momentum and bright melodic layers',
  melancholic: 'sad, emotional, reflective, with minor key harmonies and slow expressive melodies',
  romantic: 'warm, intimate, tender, with lush harmonies, gentle strings, and heartfelt melodies',
  dark: 'moody, brooding, mysterious, with deep bass tones, minor keys, and shadowy textures',
  uplifting: 'hopeful, bright, inspiring, with major key progressions and soaring melodic lines',
};

const styleDescriptors: Record<string, string> = {
  ambient: 'atmospheric sound design, evolving pads, reverb-drenched textures, no percussion',
  lofi: 'lo-fi hip hop beat, vinyl crackle, dusty samples, mellow keys, relaxed drum pattern',
  classical: 'orchestral arrangement, strings, piano, woodwinds, classical composition structure',
  electronic: 'synthesizer-driven, electronic beats, digital textures, layered arpeggios',
  nature:
    'organic sounds, field recordings, gentle wind, water, birds, mixed with soft instruments',
  jazz: 'jazz instrumentation, smooth saxophone, piano chords, walking bass, brushed drums, swing feel',
  chillhop: 'chill hop beat, jazzy samples, boom-bap drums, warm Rhodes piano, laid-back groove',
};

const intensityDescriptors: Record<string, string> = {
  soft: 'very quiet and sparse, whisper-level dynamics, minimal layering',
  medium: 'balanced dynamics, moderate layering, comfortable listening level',
  high: 'full and rich, dense layering, strong presence, bold dynamics',
};

export const promptEngine: PromptEngine = {
  buildPrompt(input: GenerateRequest): PromptPayload {
    const intensity = input.intensity ?? 'medium';

    const moodDesc = moodDescriptors[input.mood] ?? input.mood;
    const styleDesc = styleDescriptors[input.style] ?? input.style;
    const intensityDesc = intensityDescriptors[intensity] ?? intensity;

    // Retrieve RAG context fragments for richer prompt augmentation
    const ragFragments = promptRetrievalService.retrieveContext(input, 3);

    const parts = [
      `A ${input.mood} ${input.style} music track.`,
      `${moodDesc}.`,
      `${styleDesc}.`,
      `Tempo: ${input.tempo} BPM. Intensity: ${intensityDesc}.`,
    ];

    if (ragFragments.length > 0) {
      parts.push('Musical direction based on similar successful generations:');
      ragFragments.forEach((f, i) => parts.push(`${i + 1}. ${f}`));
    }

    parts.push('No vocals. Smooth transitions. Suitable for background listening.');

    const prompt = parts.join(' ');

    return { prompt };
  },
};
