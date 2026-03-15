# AI Engineering Notes — Sonic Therapy Platform

## Author: Deciwa

This document details the therapy audio science, cultural healing modes, AI prompt engineering, multi-model architecture, evaluation methodology, and RAG architecture used in the Sonic Therapy Platform.

---

## 1. Prompt Engineering

### 1.1 Evolution of the Prompt Strategy

The prompt engine went through three iterations:

**v1 — Static Template (Baseline)**

```text
Generate an ambient background music track with:
Mood: {MOOD}, Style: {STYLE}, BPM: {TEMPO}, Duration: {LENGTH}s, Intensity: {INTENSITY}
Characteristics: soft pads, warm textures, smooth transitions, minimal percussions, no vocals.
```

**Problem:** All mood/style combinations produced similar-sounding outputs. "Romantic jazz" and "calm ambient" were nearly indistinguishable because the template used the same generic descriptors regardless of input.

**v2 — Descriptor-Based (Current Production)**

Each mood and style maps to specific musical descriptors:

```typescript
const moodDescriptors = {
  calm: 'gentle, peaceful, soothing, with slow evolving pads and soft sustained tones',
  romantic: 'warm, intimate, tender, with lush harmonies, gentle strings, and heartfelt melodies',
  dark: 'moody, brooding, mysterious, with deep bass tones, minor keys, and shadowy textures',
  // ...
};

const styleDescriptors = {
  jazz: 'jazz instrumentation, smooth saxophone, piano chords, walking bass, brushed drums, swing feel',
  ambient: 'atmospheric sound design, evolving pads, reverb-drenched textures, no percussion',
  // ...
};
```

**Why this works better:**

- Each combination produces a unique prompt (8 moods × 8 styles × 3 intensities = 192 distinct prompt variations)
- Descriptors use domain-specific music terminology that AI models understand
- Adding new moods/styles only requires adding descriptor entries

**v3 — RAG-Augmented (Experimental)**

Uses a knowledge base of musical fragments with cosine similarity retrieval to augment prompts with the most relevant production techniques. See Section 4.

### 1.2 Why Specific Descriptors Matter

Through iterative testing, we found that:

| Descriptor Type       | Example                                 | Model Comprehension                    |
| --------------------- | --------------------------------------- | -------------------------------------- |
| Generic mood word     | "romantic"                              | Low — model interprets loosely         |
| Musical adjectives    | "warm, intimate, tender"                | Medium — better emotional targeting    |
| Instrumentation hints | "lush harmonies, gentle strings"        | High — directly influences arrangement |
| Technical music terms | "ii-V-I jazz voicings, extended chords" | Highest — precise musical structure    |

The production prompt engine combines all four levels for maximum specificity.

### 1.3 Intensity as a Dynamic Control

Intensity isn't just a label — it maps to specific production characteristics:

- **soft**: `very quiet and sparse, whisper-level dynamics, minimal layering`
- **medium**: `balanced dynamics, moderate layering, comfortable listening level`
- **high**: `full and rich, dense layering, strong presence, bold dynamics`

This affects the AI model's interpretation of arrangement density, volume, and instrumentation count.

### 1.4 Prompt Structure Design

The final prompt follows a deliberate structure:

```
1. Identity statement: "A {mood} {style} music track."
2. Mood descriptors: emotional character and feel
3. Style descriptors: instrumentation and technique
4. Technical parameters: tempo and intensity dynamics
5. Constraints: "No vocals. Smooth transitions."
```

This ordering matters — AI models weight earlier tokens more heavily, so the identity statement anchors the generation, and constraints at the end act as guardrails.

---

## 2. Multi-Model Architecture

### 2.1 Provider Abstraction

The `AudioProvider` interface abstracts all model-specific details:

```typescript
interface AudioProvider {
  generateTrack(params: { prompt: string; tempo: number; lengthSeconds: number }): Promise<{
    tempFilePath: string;
    format: 'wav' | 'mp3';
    providerVersion?: string | null;
  }>;
}
```

Current implementations:

- **ReplicateMusicGenProvider** — Meta's MusicGen via Replicate (primary)
- **DefaultAudioProvider** — OpenAI audio generation (fallback)

### 2.2 Fallback Strategy

The `MultiProviderWithFallback` orchestrator:

1. Tries providers in priority order (lowest priority number = tried first)
2. Logs latency and success/failure for each attempt
3. Falls through to the next provider on failure
4. Reports aggregated errors if all providers fail

```typescript
const audioProvider = new MultiProviderWithFallback([
  { name: 'replicate-musicgen', provider: new ReplicateMusicGenProvider(), priority: 1 },
  { name: 'openai-audio', provider: new DefaultAudioProvider(), priority: 2 },
]);
```

**Why this design:**

- Provider outages don't cause complete service failure
- Latency and error data enables informed provider selection
- New providers can be added without changing orchestration logic
- Priority can be adjusted based on evaluation data

### 2.3 Provider Selection Criteria

| Criteria                 | MusicGen (Replicate)       | OpenAI Audio       |
| ------------------------ | -------------------------- | ------------------ |
| Music-specific training  | Yes (music-focused model)  | No (general audio) |
| Duration control         | Native (up to 120s)        | Approximate        |
| Output quality for music | High                       | Medium             |
| Latency                  | 20-90s depending on length | 5-15s              |
| Cost per generation      | ~$0.02-0.05                | ~$0.01-0.03        |

MusicGen is preferred because it's specifically trained on music generation tasks, but OpenAI serves as a reliable fallback.

---

## 3. Evaluation Framework

### 3.1 Rating Dimensions

Each generated track can be evaluated on four dimensions (1-5 scale):

| Dimension          | Weight | What It Measures                                |
| ------------------ | ------ | ----------------------------------------------- |
| **Satisfaction**   | 30%    | Overall user satisfaction with the output       |
| **Mood Accuracy**  | 25%    | Did the output match the requested mood?        |
| **Style Accuracy** | 25%    | Did the output match the requested style?       |
| **Audio Quality**  | 20%    | Technical audio fidelity and production quality |

The weighted formula:

```
overallScore = satisfaction × 0.30 + moodAccuracy × 0.25 + styleAccuracy × 0.25 + audioQuality × 0.20
```

### 3.2 Evaluation Levels

Ratings are aggregated at three levels:

1. **Track level** — individual track quality
2. **Provider level** — comparing MusicGen vs OpenAI across all generations
3. **Mood × Style matrix** — identifying which combinations produce the best/worst results

### 3.3 Mood × Style Matrix

The evaluation service can produce a heatmap-style matrix showing average satisfaction per mood/style combination:

```
              ambient  lofi  jazz  cinematic  electronic  classical
    calm        4.2    3.8   3.5     3.9        3.2        4.0
    romantic    3.5    3.2   4.5     4.1        3.0        4.3
    dark        4.0    2.8   3.0     4.5        4.2        3.1
    ...
```

This identifies:

- **Strong combinations** to promote in the UI
- **Weak combinations** where the prompt engine needs improvement
- **Model blind spots** where certain mood/style pairs consistently underperform

### 3.4 Database Schema

```sql
CREATE TABLE track_ratings (
  id bigserial PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES tracks(id),
  user_id uuid NOT NULL REFERENCES app_users(id),
  satisfaction smallint NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  mood_accuracy smallint NOT NULL CHECK (mood_accuracy BETWEEN 1 AND 5),
  style_accuracy smallint NOT NULL CHECK (style_accuracy BETWEEN 1 AND 5),
  audio_quality smallint NOT NULL CHECK (audio_quality BETWEEN 1 AND 5),
  comment text,
  UNIQUE (track_id, user_id)
);
```

---

## 4. RAG Component (Retrieval-Augmented Generation)

### 4.1 Architecture

The prompt retrieval service implements a lightweight, in-memory RAG pattern:

```
User Request → Tag Embedding → Cosine Similarity Search → Top-K Retrieval → Augmented Prompt
```

### 4.2 Knowledge Base

A curated set of musical production knowledge fragments, each tagged with relevant moods/styles/intensities:

```typescript
{
  id: 'mood-romantic-1',
  tags: ['romantic', 'jazz', 'medium'],
  text: 'Use ii-V-I progressions with extended voicings (9ths, 13ths). Breathy saxophone or flugelhorn melodies.',
}
```

Currently 20+ entries covering mood-specific techniques, style-specific production methods, and intensity-appropriate arrangements.

### 4.3 Embedding Strategy

For the in-memory implementation, we use a **bag-of-tags with IDF weighting**:

1. Each knowledge entry is represented as a vector over the tag vocabulary
2. Tags that appear in fewer entries get higher weight (IDF-like)
3. Query vectors are computed the same way from the user's mood/style/intensity

```typescript
function computeTagEmbedding(tags: string[]): number[] {
  return tagVocabulary.map((term) => {
    if (!tags.includes(term)) return 0;
    return 1.0 / Math.log2(1 + tagFrequency[term]);
  });
}
```

### 4.4 Retrieval

Cosine similarity between the query embedding and all knowledge entries. Top-3 fragments are retrieved and injected into the prompt:

```
A romantic jazz music track at 80 BPM, 45 seconds long.
Intensity: medium.

Musical direction based on similar successful generations:
1. Use ii-V-I progressions with extended voicings (9ths, 13ths). Breathy saxophone or flugelhorn melodies.
2. Use rootless voicings on Rhodes or Wurlitzer. Walking bass with chromatic approach notes.
3. Slow waltz-like strings with gentle pizzicato accents. Warm piano with sustain pedal.

No vocals. Smooth transitions. Suitable for background listening.
```

### 4.5 Production Upgrade Path

The current in-memory RAG can be upgraded to:

1. **External embeddings** — Replace tag-based embeddings with OpenAI `text-embedding-3-small` for semantic understanding
2. **Vector database** — Move knowledge base to pgvector (already on Supabase) for scalable similarity search
3. **Feedback loop** — High-rated tracks feed their parameters back into the knowledge base, creating a self-improving system
4. **Dynamic retrieval** — Include actual audio analysis features (spectral centroid, RMS energy) as part of the embedding

---

## 5. Prompt Benchmarking

### 5.1 Methodology

The benchmark script (`scripts/benchmark-prompts.ts`) compares four prompt strategies:

1. **Simple template** — baseline with direct parameter substitution
2. **Descriptor-based** — production strategy with mood/style-specific descriptors
3. **Narrative-style** — scene-painting approach that describes a visual/emotional scenario
4. **Technical-musical** — music theory-informed instructions with chord progressions and arrangement details

### 5.2 Evaluation Criteria

Each strategy is scored on:

| Criteria        | Weight | Description                                       |
| --------------- | ------ | ------------------------------------------------- |
| Specificity     | 25%    | How detailed and specific is the prompt?          |
| Mood Accuracy   | 25%    | Does the prompt clearly convey the intended mood? |
| Style Fidelity  | 20%    | Does the prompt describe the style accurately?    |
| Distinctiveness | 20%    | Would different combos produce distinct outputs?  |
| Clarity         | 10%    | Is the prompt unambiguous for the AI model?       |

### 5.3 Running the Benchmark

```bash
npx tsx scripts/benchmark-prompts.ts
```

The script tests all strategies against 6 diverse mood/style combinations and produces aggregate scores.

### 5.4 Key Findings

From iterative testing:

- **Simple templates score ~55-60%** — too generic, low distinctiveness
- **Descriptor-based scores ~75-80%** — good balance of specificity and clarity
- **Narrative scores ~65-70%** — creative but sometimes ambiguous for models
- **Technical-musical scores ~70-75%** — precise but may over-constrain certain models

The descriptor-based strategy was chosen for production because it balances specificity with model flexibility.

---

## 6. Therapy Prompt Engineering & Audio Science

### 6.1 Frequency Mapping

The therapy system maps 20 therapeutic goals to brainwave frequency bands and Solfeggio tones:

| Band  | Hz Range | Goals                                                  | Solfeggio Range |
| ----- | -------- | ------------------------------------------------------ | --------------- |
| Delta | 0.1–4    | Deep sleep, pain relief, healing, anti-aging           | 174–285 Hz      |
| Theta | 4–8      | REM sleep, deep relaxation, meditation, emotion relief | 285–396 Hz      |
| Alpha | 8–13     | Creativity, relaxed focus, stress reduction            | 396–528 Hz      |
| Beta  | 13–30    | Fast learning, focused attention, active lifestyle     | 528–741 Hz      |
| Gamma | 30–100   | High cognition, memory recall, peak awareness          | 741–963 Hz      |

Implementation: `src/services/therapy/frequencyMappingService.ts`

### 6.2 Smart Tempo

Each therapy goal maps to a research-based BPM instead of a fixed value:

- **Delta goals** (deep sleep, pain relief): 55–62 BPM — parasympathetic activation
- **Theta goals** (relaxation, meditation): 60–68 BPM — resting heart rate alignment
- **Alpha goals** (creativity, stress reduction): 68–75 BPM — moderate calm
- **Beta goals** (learning, focus): 80–90 BPM — active engagement
- **Gamma goals** (cognition, peak awareness): 90–100 BPM — high alertness

### 6.3 Session Phasing (3-Phase Entrainment)

Instead of a fixed binaural beat frequency for the entire track, the system uses a 3-phase entrainment ramp:

1. **Induction (15%)** — starts from an alert-state frequency, ramps down toward the target Hz
2. **Deepening (70%)** — holds the core therapeutic frequency; Solfeggio tone is active during this phase
3. **Emergence (15%)** — gently ramps back up to alpha (~10 Hz) for a smooth return

This is implemented via ffmpeg `aevalsrc` with a piecewise-linear frequency sweep expression, generating smooth transitions between phases rather than abrupt frequency jumps.

Implementation: `src/services/therapy/frequencyMappingService.ts` (phase resolution) + `src/services/therapy/binauralMixService.ts` (ffmpeg expression generation)

### 6.4 Cultural Healing Modes

Three cultural traditions inject goal-specific musical guidance into the AI prompt:

- **Chinese Five-Element** — pentatonic scale mapped to organ systems (Wood/Fire/Earth/Metal/Water). Each goal maps to an element with specific tonal characteristics (e.g., Wood → Jue/E note → liver/gallbladder healing).
- **Indian Raga Chikitsa** — classical ragas matched to time-of-day and condition. Each goal maps to a specific raga with melodic constraints (e.g., Raga Bhairavi for pain relief, Raga Yaman for relaxation).
- **Ottoman Maqam** — maqam modal system with quarter-tone intervals. Each goal maps to a maqam with specific tonal qualities (e.g., Maqam Rast for balance, Maqam Hicaz for emotional depth).

Each mode provides:

- `musicalGuidance`: general instructions for the cultural tradition
- Goal-specific `refinement`: detailed musical direction for the specific therapeutic goal

These are injected into the AI prompt via `therapyPromptEngine.ts`, so the AI model receives concrete musical instructions alongside the standard therapy parameters.

### 6.5 Therapy Prompt Structure

The therapy prompt engine (`src/services/therapy/therapyPromptEngine.ts`) builds prompts differently from the ambient engine:

```
1. Identity: "A therapeutic {genre} music track for {goal}."
2. Frequency context: "Targeting {band} brainwave band at {hz} Hz."
3. Musical descriptors: genre-appropriate instrumentation
4. Cultural guidance (if selected): tradition-specific musical instructions
5. Constraints: tempo, duration, intensity, no vocals
```

This ensures the AI model generates music that complements rather than conflicts with the binaural beat overlay.

---

## 7. Future AI Engineering Work

### 7.1 Short-term

- Add audio feature extraction (spectral analysis, RMS, tempo detection) for automated quality scoring
- Implement A/B testing framework to compare prompt strategies in production
- Expand knowledge base with user-validated fragments from high-rated tracks

### 7.2 Medium-term

- Migrate RAG to pgvector for scalable semantic retrieval
- Add OpenAI text-embedding-3-small for semantic similarity instead of tag-based
- Implement provider-specific prompt adaptation (different models respond to different prompt styles)

### 7.3 Long-term

- Fine-tune a small model on high-rated track metadata for prompt optimization
- Implement reinforcement learning from human feedback (RLHF) on the prompt engine
- Build an audio fingerprinting system for duplicate/similarity detection across generations
