/**
 * Prompt Retrieval Service (RAG-lite)
 *
 * Uses cosine similarity over pre-computed embeddings to retrieve the most
 * relevant prompt fragments for a given mood/style/intensity combination.
 *
 * This is a lightweight, in-memory RAG component that:
 * 1. Maintains a knowledge base of musical descriptors with pre-computed embeddings
 * 2. Encodes incoming requests as vectors using the same embedding scheme
 * 3. Retrieves the top-k most relevant descriptors via cosine similarity
 * 4. Augments the base prompt with retrieved context
 *
 * In production, the embedding step could be replaced with an external model
 * (e.g., OpenAI text-embedding-3-small) and the knowledge base stored in a
 * vector database (pgvector, Pinecone, etc.).
 */

import { GenerateRequest } from '../../types/domain';
import { PromptPayload } from './promptEngine';

/* ─── Knowledge Base ─── */

interface KnowledgeEntry {
  id: string;
  tags: string[];
  text: string;
  embedding: number[];
}

// Musical knowledge fragments — each tagged with relevant moods/styles/intensities
const knowledgeBase: KnowledgeEntry[] = [
  // Mood fragments
  {
    id: 'mood-calm-1',
    tags: ['calm', 'ambient', 'soft'],
    text: 'Use slow-moving chord progressions with minimal harmonic tension. Emphasize sustained pads and gentle reverb tails.',
    embedding: [],
  },
  {
    id: 'mood-calm-2',
    tags: ['calm', 'nature', 'soft'],
    text: 'Incorporate subtle natural textures like distant wind or soft water. Keep dynamics below mezzo-piano.',
    embedding: [],
  },
  {
    id: 'mood-focus-1',
    tags: ['focus', 'lofi', 'medium'],
    text: 'Maintain a steady rhythmic pulse without syncopation. Use repetitive but evolving melodic patterns to aid concentration.',
    embedding: [],
  },
  {
    id: 'mood-focus-2',
    tags: ['focus', 'electronic', 'medium'],
    text: 'Layer clean sine-wave sub-bass with filtered pads. Avoid sudden transients or frequency spikes.',
    embedding: [],
  },
  {
    id: 'mood-energetic-1',
    tags: ['energetic', 'electronic', 'high'],
    text: 'Drive the rhythm with a four-on-the-floor kick pattern. Layer ascending arpeggios for forward momentum.',
    embedding: [],
  },
  {
    id: 'mood-energetic-2',
    tags: ['energetic', 'chillhop', 'medium'],
    text: 'Use boom-bap drum patterns with bright hi-hat rolls. Add funky bass lines with rhythmic variation.',
    embedding: [],
  },
  {
    id: 'mood-dark-1',
    tags: ['dark', 'ambient', 'high'],
    text: 'Use tritone intervals and chromatic movement. Deep sub-bass drones with granular synthesis textures.',
    embedding: [],
  },
  {
    id: 'mood-dark-2',
    tags: ['dark', 'cinematic', 'high'],
    text: 'Employ low brass and cello staccato for tension. Use reverse reverb and spectral processing for unease.',
    embedding: [],
  },
  {
    id: 'mood-romantic-1',
    tags: ['romantic', 'jazz', 'medium'],
    text: 'Use ii-V-I progressions with extended voicings (9ths, 13ths). Breathy saxophone or flugelhorn melodies.',
    embedding: [],
  },
  {
    id: 'mood-romantic-2',
    tags: ['romantic', 'classical', 'soft'],
    text: 'Slow waltz-like strings with gentle pizzicato accents. Warm piano with sustain pedal for lush resonance.',
    embedding: [],
  },
  {
    id: 'mood-dreamy-1',
    tags: ['dreamy', 'ambient', 'soft'],
    text: 'Heavy reverb and delay processing. Pitch-shifted vocal textures and granular cloud pads. Half-tempo feel.',
    embedding: [],
  },
  {
    id: 'mood-melancholy-1',
    tags: ['melancholy', 'classical', 'medium'],
    text: 'Minor key with descending bass lines. Solo piano or cello melody with rubato phrasing and expressive dynamics.',
    embedding: [],
  },
  {
    id: 'mood-uplifting-1',
    tags: ['uplifting', 'cinematic', 'high'],
    text: 'Build from sparse to full orchestral. Ascending key modulations every 16 bars. Timpani rolls into climactic brass.',
    embedding: [],
  },
  // Style-specific technique fragments
  {
    id: 'style-lofi-texture',
    tags: ['lofi', 'chillhop'],
    text: 'Apply vinyl crackle, tape wobble, and bit-crushing to add warmth. Side-chain compress the pad to the kick.',
    embedding: [],
  },
  {
    id: 'style-jazz-voicing',
    tags: ['jazz'],
    text: 'Use rootless voicings on Rhodes or Wurlitzer. Walking bass with chromatic approach notes. Swing eighth notes.',
    embedding: [],
  },
  {
    id: 'style-ambient-design',
    tags: ['ambient', 'nature'],
    text: 'Granular synthesis with long grain sizes. Freeze and spectral stretch of acoustic source material.',
    embedding: [],
  },
  {
    id: 'style-cinematic-build',
    tags: ['cinematic'],
    text: 'Layered ostinato patterns building in density. Wide stereo panning. Sub-bass risers and cymbal swells.',
    embedding: [],
  },
  {
    id: 'style-electronic-synthesis',
    tags: ['electronic'],
    text: 'Wavetable synthesis with modulated filters. Sequenced arpeggios through analog-modeled delay and reverb.',
    embedding: [],
  },
  {
    id: 'style-classical-arrange',
    tags: ['classical'],
    text: 'Counterpoint between upper and lower voices. Appropriate period-style ornamentation. Dynamic phrasing.',
    embedding: [],
  },
];

/* ─── Lightweight Embedding ─── */

// Tag vocabulary for our simple embedding scheme
const tagVocabulary = [
  'calm', 'focus', 'energetic', 'dark', 'dreamy', 'romantic', 'melancholy', 'uplifting',
  'ambient', 'lofi', 'cinematic', 'electronic', 'classical', 'nature', 'jazz', 'chillhop',
  'soft', 'medium', 'high',
];

function computeTagEmbedding(tags: string[]): number[] {
  // Binary bag-of-tags embedding with IDF-like weighting
  const tagFrequencies: Record<string, number> = {};
  for (const entry of knowledgeBase) {
    for (const t of entry.tags) {
      tagFrequencies[t] = (tagFrequencies[t] ?? 0) + 1;
    }
  }

  return tagVocabulary.map((term) => {
    if (!tags.includes(term)) return 0;
    // IDF weighting: rarer tags get higher weight
    const freq = tagFrequencies[term] ?? 1;
    return 1.0 / Math.log2(1 + freq);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// Pre-compute embeddings for all knowledge entries
for (const entry of knowledgeBase) {
  entry.embedding = computeTagEmbedding(entry.tags);
}

/* ─── Retrieval Service ─── */

export interface PromptRetrievalService {
  retrieveContext(input: GenerateRequest, topK?: number): string[];
  buildAugmentedPrompt(input: GenerateRequest): PromptPayload;
}

export const promptRetrievalService: PromptRetrievalService = {
  retrieveContext(input: GenerateRequest, topK = 3): string[] {
    const queryTags = [input.mood, input.style, input.intensity ?? 'medium'];
    const queryEmbedding = computeTagEmbedding(queryTags);

    const scored = knowledgeBase.map((entry) => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, topK)
      .filter((s) => s.score > 0)
      .map((s) => s.entry.text);
  },

  buildAugmentedPrompt(input: GenerateRequest): PromptPayload {
    const retrievedFragments = this.retrieveContext(input, 3);
    const intensity = input.intensity ?? 'medium';

    const prompt = [
      `A ${input.mood} ${input.style} music track at ${input.tempo} BPM, ${input.length} seconds long.`,
      `Intensity: ${intensity}.`,
      '',
      'Musical direction based on similar successful generations:',
      ...retrievedFragments.map((f, i) => `${i + 1}. ${f}`),
      '',
      'No vocals. Smooth transitions. Suitable for background listening.',
    ].join('\n');

    return { prompt };
  },
};
