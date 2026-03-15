'use client';

import { Fragment, FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import type {
  BodyArea,
  CulturalMode,
  EmotionTarget,
  IntensityLevel,
  TherapyGoal,
  TherapyRequest,
} from '@/lib/types';

/* ─── Static Data ─── */

const therapyGoals: { value: TherapyGoal; label: string; category: string }[] = [
  { value: 'pain_relief', label: 'Pain relief', category: 'Physical' },
  { value: 'healing', label: 'Healing support', category: 'Physical' },
  { value: 'anti_aging', label: 'Anti-aging', category: 'Physical' },
  { value: 'emotion_relief', label: 'Emotion relief', category: 'Emotional' },
  { value: 'stress_reduction', label: 'Stress reduction', category: 'Emotional' },
  { value: 'positive_thinking', label: 'Positive thinking', category: 'Emotional' },
  { value: 'deep_sleep', label: 'Deep sleep', category: 'Sleep' },
  { value: 'rem_sleep', label: 'REM sleep', category: 'Sleep' },
  { value: 'deep_relaxation', label: 'Deep relaxation', category: 'Relaxation' },
  { value: 'meditation', label: 'Meditation', category: 'Relaxation' },
  { value: 'creativity', label: 'Creativity', category: 'Mental' },
  { value: 'relaxed_focus', label: 'Relaxed focus', category: 'Mental' },
  { value: 'fast_learning', label: 'Fast learning', category: 'Mental' },
  { value: 'focused_attention', label: 'Focused attention', category: 'Cognitive' },
  { value: 'cognitive_thinking', label: 'Cognitive thinking', category: 'Cognitive' },
  { value: 'problem_solving', label: 'Problem solving', category: 'Cognitive' },
  { value: 'active_lifestyle', label: 'Active lifestyle', category: 'Cognitive' },
  { value: 'high_cognition', label: 'High-level cognition', category: 'Peak' },
  { value: 'memory_recall', label: 'Memory recall', category: 'Peak' },
  { value: 'peak_awareness', label: 'Peak awareness', category: 'Peak' },
];

const bodyAreas: { value: BodyArea; label: string }[] = [
  { value: 'head', label: 'Head / Headaches' },
  { value: 'back', label: 'Back pain' },
  { value: 'chest', label: 'Chest pain' },
  { value: 'abdominal', label: 'Abdominal pain' },
  { value: 'shoulder', label: 'Shoulder pain' },
  { value: 'hip', label: 'Hip pain' },
  { value: 'knee', label: 'Knee pain' },
  { value: 'leg', label: 'Leg pain' },
  { value: 'joint', label: 'Joint pain & swelling' },
  { value: 'muscle', label: 'Muscle aches' },
  { value: 'nerve', label: 'Nerve pain' },
  { value: 'chronic', label: 'Chronic pain' },
  { value: 'period', label: 'Painful periods' },
  { value: 'painful_sex', label: 'Painful sex (women)' },
  { value: 'penis_pain', label: 'Penis injury / pain' },
  { value: 'groin', label: 'Groin pain' },
];

const emotions: { value: EmotionTarget; label: string }[] = [
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'depression', label: 'Depression' },
  { value: 'sadness', label: 'Sadness' },
  { value: 'anger', label: 'Anger' },
  { value: 'fear', label: 'Fear' },
  { value: 'loneliness', label: 'Loneliness' },
  { value: 'frustration', label: 'Frustration' },
  { value: 'guilt', label: 'Guilt' },
  { value: 'shame', label: 'Shame' },
  { value: 'despair', label: 'Despair' },
  { value: 'confusion', label: 'Confusion' },
  { value: 'hurt', label: 'Hurt' },
  { value: 'disappointment', label: 'Disappointment' },
  { value: 'embarrassment', label: 'Embarrassment' },
  { value: 'boredom', label: 'Boredom' },
  { value: 'hostility', label: 'Hostility' },
  { value: 'annoyance', label: 'Annoyance' },
  { value: 'envy', label: 'Envy' },
  { value: 'jealousy', label: 'Jealousy' },
  { value: 'hate', label: 'Hate' },
  { value: 'contempt', label: 'Contempt' },
  { value: 'disgust', label: 'Disgust' },
  { value: 'surprise', label: 'Surprise' },
  { value: 'pride', label: 'Pride' },
];

const genreCategories: { category: string; genres: string[] }[] = [
  {
    category: 'Alternative',
    genres: [
      'Alternative Rock',
      'College Rock',
      'Experimental Rock',
      'Goth Rock',
      'Grunge',
      'Hardcore Punk',
      'Hard Rock',
      'Indie Rock',
      'New Wave',
      'Progressive Rock',
      'Punk',
      'Shoegaze',
      'Steampunk',
    ],
  },
  {
    category: 'Blues',
    genres: [
      'Acoustic Blues',
      'Chicago Blues',
      'Classic Blues',
      'Contemporary Blues',
      'Country Blues',
      'Delta Blues',
      'Electric Blues',
    ],
  },
  {
    category: 'Classical',
    genres: [
      'Avant-Garde',
      'Baroque',
      'Chamber Music',
      'Chant',
      'Choral',
      'Classical Crossover',
      'Early Music',
      'High Classical',
      'Impressionist',
      'Medieval',
      'Minimalism',
      'Modern Composition',
      'Opera',
      'Orchestral',
      'Renaissance',
      'Romantic',
      'Wedding Music',
    ],
  },
  {
    category: 'Country',
    genres: [
      'Alternative Country',
      'Americana',
      'Bluegrass',
      'Contemporary Bluegrass',
      'Contemporary Country',
      'Country Gospel',
      'Honky Tonk',
      'Outlaw Country',
      'Traditional Bluegrass',
      'Traditional Country',
      'Urban Cowboy',
    ],
  },
  {
    category: 'Dance / EDM',
    genres: [
      'Breakbeat',
      'Dubstep',
      'Exercise',
      'Garage',
      'Hardcore',
      'Hard Dance',
      'Hi-NRG / Eurodance',
      'House',
      'Jackin House',
      "Jungle/Drum'n'bass",
      'Techno',
      'Trance',
    ],
  },
  { category: 'Easy Listening', genres: ['Bop', 'Lounge', 'Swing'] },
  {
    category: 'Electronic',
    genres: [
      'Ambient',
      'Crunk',
      'Downtempo',
      'Electro',
      'Electronica',
      'Electronic Rock',
      'IDM/Experimental',
      'Industrial',
    ],
  },
  {
    category: 'Hip-Hop / Rap',
    genres: [
      'Alternative Rap',
      'Bounce',
      'Dirty South',
      'East Coast Rap',
      'Gangsta Rap',
      'Hardcore Rap',
      'Hip-Hop',
      'Latin Rap',
      'Old School Rap',
      'Rap',
      'Underground Rap',
      'West Coast Rap',
    ],
  },
  { category: 'Indie Pop', genres: ['Indie Pop'] },
  {
    category: 'Inspirational',
    genres: [
      'CCM',
      'Christian Metal',
      'Christian Pop',
      'Christian Rap',
      'Christian Rock',
      'Classic Christian',
      'Contemporary Gospel',
      'Gospel',
      'Praise & Worship',
      'Qawwali',
      'Southern Gospel',
      'Traditional Gospel',
    ],
  },
  {
    category: 'Jazz',
    genres: [
      'Acid Jazz',
      'Avant-Garde Jazz',
      'Big Band',
      'Blue Note',
      'Contemporary Jazz',
      'Cool',
      'Crossover Jazz',
      'Dixieland',
      'Ethio-jazz',
      'Fusion',
      'Hard Bop',
      'Latin Jazz',
      'Mainstream Jazz',
      'Ragtime',
      'Smooth Jazz',
      'Trad Jazz',
    ],
  },
  {
    category: 'K-Pop / J-Pop',
    genres: ['K-Pop', 'J-Pop', 'J-Rock', 'J-Synth', 'J-Ska', 'J-Punk', 'Kayokyoku'],
  },
  {
    category: 'Latino',
    genres: [
      'Alternativo & Rock Latino',
      'Baladas y Boleros',
      'Brazilian',
      'Contemporary Latin',
      'Latin Jazz',
      'Pop Latino',
      'Ra\u00edces',
      'Reggaeton y Hip-Hop',
      'Regional Mexicano',
      'Salsa y Tropical',
    ],
  },
  {
    category: 'New Age',
    genres: ['Environmental', 'Healing', 'Meditation', 'Nature', 'Relaxation', 'Travel'],
  },
  {
    category: 'Pop',
    genres: ['Adult Contemporary', 'Britpop', 'Pop/Rock', 'Soft Rock', 'Teen Pop'],
  },
  {
    category: 'R&B / Soul',
    genres: [
      'Contemporary R&B',
      'Disco',
      'Doo Wop',
      'Funk',
      'Motown',
      'Neo-Soul',
      'Quiet Storm',
      'Soul',
    ],
  },
  { category: 'Reggae', genres: ['Dancehall', 'Dub', 'Roots Reggae', 'Ska'] },
  {
    category: 'Rock',
    genres: [
      'Adult Alternative',
      'American Trad Rock',
      'Arena Rock',
      'Blues-Rock',
      'British Invasion',
      'Death Metal/Black Metal',
      'Glam Rock',
      'Hair Metal',
      'Hard Rock',
      'Metal',
      'Jam Bands',
      'Prog-Rock/Art Rock',
      'Psychedelic',
      'Rock & Roll',
      'Rockabilly',
      'Roots Rock',
      'Singer/Songwriter',
      'Southern Rock',
      'Surf',
      'Tex-Mex',
    ],
  },
  { category: 'Fitness & Workout', genres: ['Fitness & Workout'] },
  {
    category: 'Holiday',
    genres: [
      'Chanukah',
      'Christmas',
      "Christmas: Children's",
      'Christmas: Classic',
      'Christmas: Classical',
      'Christmas: Jazz',
      'Christmas: Modern',
      'Christmas: Pop',
      'Christmas: R&B',
      'Christmas: Religious',
      'Christmas: Rock',
      'Easter',
      'Halloween',
      'Thanksgiving',
    ],
  },
  {
    category: 'Other',
    genres: [
      'Disney',
      'Enka',
      'French Pop',
      'German Folk',
      'German Pop',
      'Instrumental',
      'Karaoke',
      'March (Marching Band)',
    ],
  },
];

const intensities: IntensityLevel[] = ['soft', 'medium', 'high'];

const culturalModes: { value: CulturalMode; label: string; description: string }[] = [
  {
    value: 'chinese_five_element',
    label: 'Chinese Five-Element',
    description:
      'Pentatonic scale (Gong, Shang, Jue, Zheng, Yu) mapped to organ systems — guzheng, erhu, dizi textures.',
  },
  {
    value: 'indian_raga',
    label: 'Indian Raga Chikitsa',
    description:
      'Classical ragas matched to time-of-day and condition — sitar, tanpura drone, tabla rhythms.',
  },
  {
    value: 'ottoman_maqam',
    label: 'Ottoman Maqam Therapy',
    description: 'Maqam modal system with quarter-tone intervals — ney, oud, kanun textures.',
  },
];

/* ─── Component ─── */

type Step = 'goal' | 'detail' | 'genre' | 'culture' | 'settings' | 'generating';

interface TherapyPanelProps {
  baseUrl: string;
  apiKey: string;
  onTrackGenerated?: () => void;
}

export function TherapyPanel({ baseUrl, apiKey, onTrackGenerated }: TherapyPanelProps) {
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<TherapyGoal>('deep_relaxation');
  const [bodyArea, setBodyArea] = useState<BodyArea | undefined>(undefined);
  const [emotion, setEmotion] = useState<EmotionTarget | undefined>(undefined);
  const [genres, setGenres] = useState<string[]>(['Ambient']);
  const [genreSearch, setGenreSearch] = useState('');
  const [culturalMode, setCulturalMode] = useState<CulturalMode | undefined>(undefined);
  const [duration, setDuration] = useState(120);
  const [intensity, setIntensity] = useState<IntensityLevel>('medium');
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const progressStartRef = useRef(0);
  const progressEstRef = useRef(0);

  const needsBodyArea = goal === 'pain_relief';
  const needsEmotion = goal === 'emotion_relief';
  const needsDetailStep = needsBodyArea || needsEmotion;

  // Progress simulation
  useEffect(() => {
    if (step !== 'generating') {
      if (progress > 0 && progress < 100) {
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 600);
        return () => clearTimeout(t);
      }
      return;
    }

    const estimatedSeconds = duration * 0.5 + 15;
    progressStartRef.current = Date.now();
    progressEstRef.current = estimatedSeconds;
    setProgress(0);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - progressStartRef.current) / 1000;
      const raw = (elapsed / estimatedSeconds) * 100;
      const eased = Math.min(92, raw * (1 - raw / 400));
      setProgress(Math.round(eased));
    }, 300);

    return () => clearInterval(interval);
  }, [step, duration]);

  function goNext() {
    if (step === 'goal') {
      setStep(needsDetailStep ? 'detail' : 'genre');
    } else if (step === 'detail') {
      setStep('genre');
    } else if (step === 'genre') {
      setStep('culture');
    } else if (step === 'culture') {
      setStep('settings');
    }
  }

  function goBack() {
    if (step === 'detail') setStep('goal');
    else if (step === 'genre') setStep(needsDetailStep ? 'detail' : 'goal');
    else if (step === 'culture') setStep('genre');
    else if (step === 'settings') setStep('culture');
  }

  function resetAll() {
    setStep('goal');
    setGoal('deep_relaxation');
    setBodyArea(undefined);
    setEmotion(undefined);
    setGenres(['Ambient']);
    setGenreSearch('');
    setCulturalMode(undefined);
    setDuration(120);
    setIntensity('medium');
    setProgress(0);
  }

  async function handleGenerate() {
    if (!apiKey) return;

    const payload: TherapyRequest = {
      goal,
      genre: genres.join(', '),
      durationSeconds: duration,
      intensity,
      ...(needsBodyArea && bodyArea ? { bodyArea } : {}),
      ...(needsEmotion && emotion ? { emotion } : {}),
      ...(culturalMode ? { culturalMode } : {}),
    };

    // Show spinner only after a short delay so fast errors (e.g. invalid key) skip it
    const spinnerTimer = setTimeout(() => setStep('generating'), 350);

    try {
      await api.generateTherapyTrack(baseUrl, apiKey, payload);
      clearTimeout(spinnerTimer);
      toast('success', 'Therapy track generated successfully.');
      setStep('settings');
      onTrackGenerated?.();
    } catch (cause) {
      clearTimeout(spinnerTimer);
      toast('error', cause instanceof Error ? cause.message : 'Therapy track generation failed');
      setStep('settings');
    }
  }

  const goalCategories = [...new Set(therapyGoals.map((g) => g.category))];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      {(() => {
        const visibleSteps: Step[] = ['goal'];
        if (needsDetailStep) visibleSteps.push('detail');
        visibleSteps.push('genre', 'culture', 'settings');
        const currentIndex = visibleSteps.indexOf(step === 'generating' ? 'settings' : step);
        const labels: Record<string, string> = {
          goal: 'Goal',
          detail: needsBodyArea ? 'Body area' : 'Emotion',
          genre: 'Genre',
          culture: 'Tradition',
          settings: 'Settings',
        };
        return (
          <div className="flex w-full items-center px-1">
            {visibleSteps.map((s, i) => {
              const isActive = i === currentIndex;
              const isDone = i < currentIndex;
              return (
                <Fragment key={s}>
                  {i > 0 && (
                    <div
                      className={`mx-2 h-px flex-1 ${isDone ? 'bg-primary/50' : 'bg-base-300/50'}`}
                    />
                  )}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold ${
                        isActive
                          ? 'bg-primary text-primary-content'
                          : isDone
                            ? 'bg-primary/20 text-primary'
                            : 'bg-base-300/40 text-base-content/40'
                      }`}
                    >
                      {isDone ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="h-3 w-3"
                        >
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-base-content/40'}`}
                    >
                      {labels[s]}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        );
      })()}

      {/* ── Step: Goal ── */}
      {step === 'goal' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-base-content">
              What is your therapeutic goal?
            </h3>
            <p className="mt-1 text-sm text-base-content/50">
              Select what you want to achieve. The system will map your goal to the optimal
              brainwave frequency and Solfeggio tone.
            </p>
          </div>

          {goalCategories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-xs uppercase tracking-wider text-base-content/40">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {therapyGoals
                  .filter((g) => g.category === cat)
                  .map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      className={`btn btn-sm ${
                        goal === g.value
                          ? 'btn-primary'
                          : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
                      }`}
                      onClick={() => setGoal(g.value)}
                    >
                      {g.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <button type="button" className="btn btn-primary w-full" onClick={goNext}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Detail (body area or emotion) ── */}
      {step === 'detail' && needsBodyArea && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-base-content">
              Where do you feel discomfort?
            </h3>
            <p className="mt-1 text-sm text-base-content/50">
              The frequency and prompt will be refined based on the target area.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {bodyAreas.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`btn btn-sm justify-start ${
                  bodyArea === b.value
                    ? 'btn-primary'
                    : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
                }`}
                onClick={() => setBodyArea(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={goNext}
              disabled={!bodyArea}
            >
              Continue
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'detail' && needsEmotion && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-base-content">Which emotion needs relief?</h3>
            <p className="mt-1 text-sm text-base-content/50">
              The music and Solfeggio frequency will be tailored to address this specific emotion.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {emotions.map((e) => (
              <button
                key={e.value}
                type="button"
                className={`btn btn-sm justify-start ${
                  emotion === e.value
                    ? 'btn-primary'
                    : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
                }`}
                onClick={() => setEmotion(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={goNext}
              disabled={!emotion}
            >
              Continue
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Genre ── */}
      {step === 'genre' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-base-content">What music do you enjoy?</h3>
            <p className="mt-1 text-sm text-base-content/50">
              Select one or more genres. The AI will blend them into your therapeutic track with
              healing frequencies layered underneath.
            </p>
            {genres.length > 0 && <p className="text-xs text-primary">{genres.length} selected</p>}
          </div>

          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input input-bordered input-sm w-full bg-base-100 pl-9"
              placeholder="Search genres..."
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
            {(() => {
              const filtered = genreCategories
                .map((cat) => ({
                  ...cat,
                  genres: cat.genres.filter((g) =>
                    g.toLowerCase().includes(genreSearch.toLowerCase()),
                  ),
                }))
                .filter((cat) => cat.genres.length > 0);

              if (filtered.length === 0 && genreSearch) {
                return (
                  <p className="py-6 text-center text-sm text-base-content/40">
                    No genres match &quot;{genreSearch}&quot;
                  </p>
                );
              }

              return filtered.map((cat) => (
                <div key={cat.category}>
                  <p className="mb-2 text-xs uppercase tracking-wider text-base-content/40">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.genres.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`btn btn-sm ${
                          genres.includes(g)
                            ? 'btn-primary'
                            : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
                        }`}
                        onClick={() =>
                          setGenres((prev) =>
                            prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                          )
                        }
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={goNext}
              disabled={genres.length === 0}
            >
              Continue
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Cultural Healing Tradition ── */}
      {step === 'culture' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-base-content">Cultural healing tradition</h3>
            <p className="mt-1 text-sm text-base-content/50">
              Optionally layer a cultural music therapy tradition into your track. This shapes the
              AI to use authentic scales, instruments, and modal systems from centuries-old healing
              practices.
            </p>
          </div>

          <div className="space-y-2">
            {/* No tradition option */}
            <button
              type="button"
              className={`btn btn-block justify-start text-left gap-3 h-auto py-3 ${
                !culturalMode
                  ? 'btn-primary'
                  : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
              }`}
              onClick={() => setCulturalMode(undefined)}
            >
              <span className="font-medium">None</span>
              <span className="text-xs opacity-70">Use genre style only, no cultural overlay.</span>
            </button>

            {culturalModes.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`btn btn-block justify-start text-left gap-3 h-auto py-3 ${
                  culturalMode === m.value
                    ? 'btn-primary'
                    : 'btn-outline border-base-300/70 text-base-content/70 hover:border-primary/40'
                }`}
                onClick={() => setCulturalMode(m.value)}
              >
                <div>
                  <span className="font-medium">{m.label}</span>
                  <p className="text-xs opacity-70 whitespace-normal">{m.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <button type="button" className="btn btn-primary w-full" onClick={goNext}>
              Continue
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Settings ── */}
      {step === 'settings' && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-lg text-base-content">Session settings</h3>
            <p className="mt-1 text-sm text-base-content/50">
              Adjust duration and intensity before generating your therapeutic track.
            </p>
          </div>

          {/* Summary of selections */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50">Goal</span>
              <span className="text-sm font-medium text-base-content capitalize">
                {goal.replace(/_/g, ' ')}
              </span>
            </div>
            {needsBodyArea && bodyArea && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-base-content/50">Body area</span>
                <span className="text-sm font-medium text-base-content capitalize">{bodyArea}</span>
              </div>
            )}
            {needsEmotion && emotion && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-base-content/50">Emotion</span>
                <span className="text-sm font-medium text-base-content capitalize">{emotion}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50">Genre</span>
              <span className="text-sm font-medium text-base-content">{genres.join(', ')}</span>
            </div>
            {culturalMode && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-base-content/50">Tradition</span>
                <span className="text-sm font-medium text-base-content">
                  {culturalModes.find((m) => m.value === culturalMode)?.label ?? culturalMode}
                </span>
              </div>
            )}
          </div>

          <label className="form-control w-full">
            <div className="mb-2">
              <span className="text-sm text-base-content/70">Duration (seconds)</span>
            </div>
            <input
              className="input input-bordered bg-base-100"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>

          <div>
            <div className="my-2">
              <span className="text-sm text-base-content/70">Intensity</span>
            </div>
            <div className="join flex w-full flex-wrap gap-2">
              {intensities.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn join-item ${
                    intensity === i
                      ? 'btn-primary'
                      : 'btn-outline border-base-300/70 text-base-content'
                  }`}
                  onClick={() => setIntensity(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => void handleGenerate()}
              disabled={!apiKey}
            >
              Generate therapy track
            </button>
            {!apiKey && (
              <p className="text-center text-xs text-warning">
                Create or select an API key first to generate tracks.
              </p>
            )}
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Generating ── */}
      {step === 'generating' && (
        <div className="space-y-4 py-8">
          <div className="text-center space-y-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-7 w-7 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl text-base-content">
              Creating your therapy session
            </h3>
            <p className="text-sm text-base-content/50">
              Generating {genres.join(' + ').toLowerCase()} music for {goal.replace(/_/g, ' ')} with
              binaural beat entrainment...
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary">Processing...</span>
              <span className="tabular-nums font-medium text-base-content">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-base-300/50">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-base-content/40">
              {(() => {
                const remaining = Math.max(
                  0,
                  Math.round(
                    progressEstRef.current - (Date.now() - progressStartRef.current) / 1000,
                  ),
                );
                return remaining > 60
                  ? `~${Math.ceil(remaining / 60)} min remaining`
                  : remaining > 0
                    ? `~${remaining}s remaining`
                    : 'Finishing up...';
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
