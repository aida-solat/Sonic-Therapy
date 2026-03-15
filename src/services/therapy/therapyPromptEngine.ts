import {
  TherapyGoal,
  TherapyRequest,
  TherapyFrequencyTarget,
  EmotionTarget,
  BodyArea,
  IntensityLevel,
  CulturalMode,
} from '../../types/domain';

export interface TherapyPromptPayload {
  prompt: string;
}

/* ─── Goal Descriptors ─── */

const goalMusicDescriptors: Record<TherapyGoal, string> = {
  pain_relief:
    'deeply soothing, with slow sustained tones, warm low-frequency pads, and gentle harmonic movement to ease physical tension',
  emotion_relief:
    'emotionally cathartic, with expressive melodies, gradual dynamic shifts, and a sense of release and resolution',
  deep_sleep:
    'extremely slow, minimal, and hypnotic, with long drone tones, barely perceptible rhythm, and fading dynamics',
  anti_aging:
    'regenerative and nurturing, with pure tones, soft harmonic overtones, and a calming sense of renewal',
  healing:
    'restorative and gentle, with clean sustained tones, warm harmonics, and slow evolving textures',
  rem_sleep:
    'dreamy and floating, with subtle melodic fragments, soft reverb, and a drifting sense of weightlessness',
  deep_relaxation:
    'profoundly calming, with slow-moving chords, warm pads, deep bass tones, and no rhythmic urgency',
  meditation:
    'still and centered, with long sustained tones, minimal movement, spacious silence between notes, and a contemplative atmosphere',
  creativity:
    'open and exploratory, with unexpected harmonic turns, playful melodic fragments, and a sense of creative freedom',
  relaxed_focus:
    'steady and clear, with gentle repetitive patterns, clean tones, and a calm but attentive energy',
  stress_reduction:
    'tension-releasing, with descending melodic lines, warm major-key harmonies, and a gradual sense of letting go',
  positive_thinking:
    'bright and uplifting, with ascending melodic movement, warm major chords, and an optimistic sense of forward motion',
  fast_learning:
    'clear and structured, with steady rhythmic pulse, clean tones, and a focused but relaxed mental space',
  focused_attention:
    'precise and steady, with consistent rhythmic patterns, minimal distraction, and a clear tonal center',
  cognitive_thinking:
    'mentally stimulating, with layered patterns, moderate complexity, and a sense of organized energy',
  problem_solving:
    'analytical and flowing, with interlocking patterns, moderate tempo, and a sense of methodical progress',
  active_lifestyle:
    'energizing and motivating, with rhythmic drive, bright tones, and a sense of forward momentum',
  high_cognition:
    'complex and engaging, with rich harmonic textures, layered melodic lines, and a heightened sense of awareness',
  memory_recall:
    'clear and evocative, with distinctive melodic motifs, clean separation between layers, and a nostalgic warmth',
  peak_awareness:
    'transcendent and expansive, with wide stereo field, shimmering overtones, and a sense of elevated consciousness',
};

/* ─── Emotion-Specific Refinements ─── */

const emotionDescriptors: Partial<Record<EmotionTarget, string>> = {
  anger:
    'releasing tension through gradually softening dynamics, moving from minor to major resolution',
  guilt: 'offering gentle forgiveness through warm harmonics and reassuring melodic resolution',
  shame: 'providing safe emotional space with soft sustained tones and non-judgmental warmth',
  depression: 'gradually introducing light and warmth, with slow ascending melodic movement',
  anxiety:
    'grounding and stabilizing, with predictable patterns, steady rhythm, and deep reassuring bass',
  fear: 'safe and protective, with stable harmonic foundation and gentle reassuring movement',
  loneliness:
    'creating a sense of companionship through warm layered harmonies and embracing textures',
  sadness:
    'honoring the emotion while gradually introducing hope through ascending harmonic resolution',
  frustration:
    'channeling energy into flowing movement, gradually smoothing sharp edges into flowing lines',
  despair: 'providing a gentle anchor with sustained low tones, slowly introducing points of light',
  hostility: 'diffusing intensity through gradual tempo reduction and softening dynamics',
  confusion: 'creating clarity through simple, organized patterns with a clear tonal center',
  boredom: 'gently stimulating curiosity with subtle harmonic shifts and evolving textures',
  hurt: 'offering tenderness through soft, careful melodic phrasing and warm sustained chords',
  envy: 'redirecting focus inward with self-affirming melodic themes and grounding bass',
  jealousy: 'cultivating contentment through warm, self-contained harmonic progressions',
  contempt: 'softening judgment through open harmonics and accepting, flowing movement',
  embarrassment: 'normalizing and soothing with gentle, steady patterns and non-dramatic textures',
  annoyance: 'smoothing irritation with flowing legato lines and soft rounded tones',
  disappointment:
    'gently rebuilding hope through ascending progressions and brightening tonal color',
  disgust: 'cleansing and purifying through clear tones, open harmonics, and fresh textures',
  hate: 'transforming intensity into calm through gradual dynamic descent and major-key resolution',
  pride: 'gently grounding inflated energy with humble, warm tones and balanced harmonic movement',
  surprise:
    'restoring calm equilibrium after shock with steady, predictable patterns and reassuring warmth',
};

/* ─── Body Area Descriptors (for pain relief context) ─── */

const bodyAreaDescriptors: Partial<Record<BodyArea, string>> = {
  head: 'focusing calming energy on the head and temples, with high-register sustained tones and gentle descending phrases',
  back: 'targeting the spine and back muscles, with deep warm bass tones and slow wave-like movement',
  chest:
    'opening the chest area, with expansive breathing-pace rhythms and warm mid-range harmonics',
  chronic:
    'providing sustained, persistent relief with long drone tones and unwavering gentle warmth',
  muscle: 'releasing muscular tension with rhythmic pulsing at a massage-like tempo and warm bass',
  joint:
    'soothing joint inflammation with gentle sustained tones and soft, flowing harmonic movement',
  nerve:
    'calming nerve sensitivity with ultra-smooth, vibrato-free tones and minimal dynamic change',
  shoulder:
    'releasing shoulder and neck tension with descending melodic patterns and warm sustained chords',
  knee: 'directing healing warmth to the knees with low-frequency pulses and steady, grounding tones',
  hip: 'easing hip discomfort with gentle rocking rhythms and warm, enveloping bass frequencies',
  leg: 'relieving leg fatigue with flowing melodic movement and gentle rhythmic massage-like pulses',
  abdominal:
    'soothing the abdominal area with deep breathing-pace rhythm and warm, nurturing tones',
  period:
    'easing menstrual discomfort with gentle warmth, slow rocking movement, and nurturing harmonics',
  groin:
    'providing gentle relief with steady low-frequency warmth and non-intrusive sustained tones',
  painful_sex:
    'providing deeply gentle, nurturing warmth with slow breathing-pace rhythm and soft, safe-feeling sustained tones',
  penis_pain:
    'directing careful soothing energy with ultra-gentle low-frequency warmth and minimal dynamic movement',
};

/* ─── Intensity Descriptors ─── */

const intensityDescriptors: Record<IntensityLevel, string> = {
  soft: 'very quiet and sparse, whisper-level dynamics, minimal layering, deeply subtle',
  medium: 'balanced dynamics, moderate layering, comfortable listening level',
  high: 'full and rich, dense layering, strong presence, immersive depth',
};

/* ─── Cultural Healing Mode Descriptors ─── */

interface CulturalModeDescriptor {
  label: string;
  musicalGuidance: string;
  goalRefinement: Partial<Record<TherapyGoal, string>>;
}

const culturalModeDescriptors: Record<CulturalMode, CulturalModeDescriptor> = {
  chinese_five_element: {
    label: 'Chinese Five-Element Music Therapy',
    musicalGuidance:
      'Use the Chinese pentatonic scale (Gong-C, Shang-D, Jue-E, Zheng-G, Yu-A). ' +
      'Compose with flowing, balanced phrasing inspired by traditional Chinese instruments ' +
      '(guzheng, erhu, dizi, pipa). Maintain the principle of balancing Yin and Yang — ' +
      'soft passages yielding to slightly brighter ones, never extreme.',
    goalRefinement: {
      pain_relief:
        'Emphasize the Gong (C) tone for Earth/Spleen — grounding, nurturing, centered energy.',
      stress_reduction:
        'Emphasize the Shang (D) tone for Metal/Lung — letting go, clarity, gentle grief release.',
      deep_relaxation:
        'Emphasize the Yu (A) tone for Water/Kidney — stillness, depth, fearlessness.',
      creativity: 'Emphasize the Jue (E) tone for Wood/Liver — growth, vision, upward movement.',
      positive_thinking: 'Emphasize the Zheng (G) tone for Fire/Heart — joy, warmth, connection.',
      emotion_relief:
        'Blend all five tones in gentle rotation to restore emotional equilibrium across organ systems.',
      healing:
        'Begin with Yu (Water) for deep rest, transition through Gong (Earth) for nourishment.',
      meditation:
        'Sustained Gong (C) drone with sparse pentatonic ornaments for centered awareness.',
    },
  },
  indian_raga: {
    label: 'Indian Raga Chikitsa (Raga Therapy)',
    musicalGuidance:
      'Use melodic frameworks (ragas) from Indian classical music. Employ the sitar, tanpura drone, ' +
      'tabla rhythms, and bansuri flute textures. Begin with an alap (slow, meditative exploration of the raga) ' +
      'before introducing rhythm. Use microtonal ornaments (gamakas) and the characteristic ascending/descending ' +
      'patterns (aroha/avaroha) of the chosen raga.',
    goalRefinement: {
      deep_sleep:
        'Use Raga Darbari Kanada — late night raga, deeply serene, descending phrases, heavy gravity.',
      deep_relaxation:
        'Use Raga Yaman — evening raga, peaceful, emotionally balanced, ascending brightness.',
      meditation:
        'Use Raga Bhairav — dawn raga, spiritual awakening, contemplative mood, semitone tensions.',
      stress_reduction:
        'Use Raga Puriya Dhanashri — dusk raga, anxiety reduction, promoting inner peace.',
      emotion_relief:
        'Use Raga Bhimpalasi — afternoon raga, uplifting from depression, gentle longing resolved to joy.',
      creativity: 'Use Raga Yaman — expansive mood, creative exploration, evening energy.',
      focused_attention:
        'Use Raga Todi — morning raga, stimulating, energizing, precise ornamentation.',
      healing:
        'Use Raga Malkauns — late night raga, deeply meditative, profound healing stillness.',
    },
  },
  ottoman_maqam: {
    label: 'Ottoman Maqam Music Therapy',
    musicalGuidance:
      'Use the Ottoman/Turkish maqam modal system with quarter-tone intervals. Employ ney (reed flute), ' +
      'oud, kanun (zither), and frame drum (bendir) textures. Follow the traditional taksim (improvisation) ' +
      "style with long melodic phrases that explore the maqam's characteristic intervals. " +
      'Include the subtle microtonal inflections that distinguish Ottoman music from Western scales.',
    goalRefinement: {
      stress_reduction:
        'Use Maqam Rast — promotes general well-being and happiness, bright and balanced.',
      deep_sleep:
        'Use Maqam U\u015F\u015Fak — traditionally prescribed for headache and insomnia, gentle and calming.',
      pain_relief:
        'Use Maqam Hicaz — associated with kidney/urinary healing, emotionally expressive.',
      emotion_relief:
        'Use Maqam Saba — associated with heart and grief processing, deeply moving and cathartic.',
      healing: 'Use Maqam Buselik — associated with bone and joint healing, grounded and stable.',
      deep_relaxation:
        'Use Maqam Nihavend — promotes emotional balance, gentle melancholy resolving to peace.',
      positive_thinking:
        'Use Maqam Rast — the "king of maqams", evokes joy, balance, and optimism.',
      meditation: 'Use Maqam Segah — contemplative, spiritual, associated with inner wisdom.',
    },
  },
};

/* ─── Genre Style Hints ─── */

function getGenreHint(genre: string): string {
  const g = genre.toLowerCase().trim();

  const genreHints: Record<string, string> = {
    // Electronic & Ambient
    ambient: 'atmospheric sound design, evolving pads, reverb-drenched textures',
    downtempo: 'slow electronic grooves, deep bass, chill atmospherics',
    idm: 'glitchy textures, complex rhythms, experimental electronic soundscapes',
    experimental: 'glitchy textures, complex rhythms, experimental electronic soundscapes',
    industrial: 'dark mechanical textures, heavy distorted synths, aggressive rhythmic patterns',
    electro: 'sharp synth leads, punchy electronic drums, futuristic textures',
    electronica: 'lush synth layers, evolving digital textures, melodic electronics',
    'electronic rock': 'guitar-driven energy fused with synthesizer textures and electronic beats',
    crunk: 'heavy bass, aggressive synths, high-energy southern electronic production',
    trance: 'euphoric synth arpeggios, driving four-on-the-floor beat, uplifting progressions',
    house: 'four-on-the-floor groove, soulful chords, deep bass, warm pads',
    techno: 'hypnotic repetitive patterns, deep bass, minimal industrial textures',
    dubstep: 'heavy wobble bass, half-time rhythms, dark atmospheric pads',
    breakbeat: 'syncopated broken beats, funky rhythmic patterns, energetic bass',
    garage: 'shuffled beats, chopped vocal samples, deep bass, UK garage groove',
    "drum'n'bass": 'fast breakbeats, heavy bass, atmospheric pads, jungle rhythms',
    jungle: 'fast breakbeats, heavy bass, atmospheric pads, jungle rhythms',
    chillwave: 'hazy lo-fi synths, nostalgic reverb-drenched textures, dreamy warmth',

    // Lo-fi & Chill
    lofi: 'lo-fi hip hop textures, vinyl warmth, dusty samples, mellow keys',
    'lo-fi': 'lo-fi hip hop textures, vinyl warmth, dusty samples, mellow keys',
    chillhop: 'chill hop groove, jazzy samples, warm Rhodes, laid-back feel',

    // New Age
    'new age': 'crystal-clear tones, ethereal pads, spiritual atmosphere',
    meditation: 'singing bowls, temple bells, sustained drone, sacred space',
    nature: 'organic sounds, gentle natural textures mixed with soft instruments',
    healing: 'restorative crystal tones, gentle resonant bowls, nurturing warmth',
    relaxation: 'calming sustained tones, warm pads, breathing-pace dynamics',
    environmental: 'field recordings blended with soft instruments, natural immersion',
    travel: 'world-influenced textures, open expansive atmosphere, journey-like progression',

    // Classical
    classical: 'orchestral arrangement, strings, piano, woodwinds',
    baroque: 'harpsichord, counterpoint, ornamental melodies, period instruments',
    romantic: 'sweeping orchestral dynamics, emotive strings, expressive piano',
    orchestral: 'full orchestra, dynamic range, cinematic scope',
    'chamber music': 'intimate ensemble, detailed interplay, refined acoustics',
    choral: 'layered vocal harmonies, sacred atmosphere, resonant space',
    chant: 'monophonic vocal lines, meditative repetition, sacred simplicity',
    opera: 'dramatic vocal expression, orchestral accompaniment, theatrical dynamics',
    impressionist: 'dreamy harmonic colors, fluid textures, Debussy-like atmospherics',
    minimalism: 'repetitive patterns, gradual phase shifts, meditative simplicity',
    'modern composition': 'contemporary techniques, extended harmonies, innovative textures',
    'avant-garde': 'experimental structure, unconventional sounds, boundary-pushing approach',
    medieval: 'modal harmonies, ancient instruments, austere beauty',
    renaissance: 'polyphonic textures, lute and recorder, Renaissance-era elegance',
    'early music': 'historical instruments, period performance, ancient modal scales',
    'wedding music': 'elegant, celebratory, warm classical or romantic arrangements',

    // Jazz
    jazz: 'jazz harmonies, smooth piano, gentle saxophone or trumpet, swing feel',
    'smooth jazz': 'polished jazz, soft saxophone melodies, gentle groove, easy listening',
    cool: 'understated jazz, relaxed tempo, restrained dynamics, subtle sophistication',
    'acid jazz': 'funky grooves, electronic elements blended with jazz harmonies',
    'latin jazz': 'Afro-Cuban rhythms, jazz harmonies, congas and timbales, vibrant energy',
    fusion: 'jazz-rock fusion, complex harmonies, electric instruments, dynamic interplay',
    'big band': 'brass sections, swing rhythm, arranged horn lines, energetic ensemble',
    dixieland: 'New Orleans jazz, collective improvisation, clarinet and trumpet leads',
    'ethio-jazz': 'Ethiopian scales and modes, jazz harmonies, vibrant Afro-jazz groove',
    ragtime: 'syncopated piano, stride patterns, jaunty turn-of-century feel',
    'hard bop': 'driving swing, blues-drenched melodies, soulful saxophone',
    'blue note': 'classic jazz, smoky atmosphere, iconic hard bop and post-bop feel',
    'contemporary jazz': 'modern jazz sensibility, open harmonies, exploratory spirit',
    'crossover jazz': 'jazz blended with pop or classical elements, accessible melodies',
    'trad jazz': 'traditional jazz ensemble, warm acoustic tone, classic swing feel',

    // Blues
    blues: 'blues harmonic movement, warm guitar tones, expressive bends',
    'acoustic blues': 'fingerpicked acoustic guitar, raw expressive vocals, Delta warmth',
    'chicago blues': 'electric guitar, harmonica, driving rhythm section, urban grit',
    'delta blues': 'raw acoustic guitar, slide technique, deep southern soul',
    'electric blues': 'overdriven electric guitar, powerful bends, heavy groove',
    'classic blues': 'traditional 12-bar structure, warm tone, timeless expression',
    'contemporary blues': 'modern production, blues roots with fresh arrangements',
    'country blues': 'rural acoustic feel, storytelling melodies, front-porch warmth',

    // R&B / Soul
    'r&b': 'soulful harmonies, warm vocals-style melodies, smooth groove',
    soul: 'deep emotional expression, gospel-influenced harmonies, warm groove',
    'neo-soul': 'organic textures, jazzy chords, warm Rhodes, conscious groove',
    funk: 'syncopated bass lines, tight rhythmic groove, brass stabs, danceable energy',
    motown: 'classic Motown groove, tambourine, warm bass, pop-soul melodies',
    disco: 'four-on-the-floor beat, strings, funky bass, euphoric dance energy',
    'doo wop': 'vocal group harmonies, simple chord progressions, nostalgic warmth',
    'quiet storm': 'smooth, intimate, late-night R&B, soft grooves, romantic atmosphere',
    'contemporary r&b': 'modern R&B production, smooth vocals, layered harmonics',
    gospel: 'uplifting harmonies, call-and-response, spiritual energy, choir-like warmth',

    // Pop & Rock
    pop: 'accessible melodic hooks, clean production, balanced arrangement',
    rock: 'warm guitar-driven textures, solid rhythmic foundation',
    'indie pop': 'gentle indie textures, dreamy guitars, soft vocals-style melodies',
    'soft rock': 'mellow guitar-driven melodies, warm harmonies, gentle dynamics',
    'adult contemporary': 'polished production, melodic, easy-listening pop sensibility',
    britpop: 'British guitar pop, catchy melodies, jangly guitars, mod influences',
    'alternative rock': 'raw guitars, introspective energy, dynamic contrast',
    'indie rock': 'lo-fi aesthetics, jangly guitars, DIY spirit, melodic hooks',
    'progressive rock': 'complex structures, time signature changes, epic arrangements',
    punk: 'raw energy, fast tempo, distorted guitars, aggressive simplicity',
    grunge: 'heavy distorted guitars, angst-filled dynamics, raw production',
    shoegaze: 'wall of reverb-drenched guitars, ethereal layered textures, dreamy haze',
    'new wave': 'synth-pop textures, angular guitars, post-punk energy, quirky melodies',
    'hard rock': 'powerful guitar riffs, driving drums, high-energy rock foundation',
    metal: 'heavy distorted guitars, powerful drums, aggressive energy, dense layers',
    'death metal': 'extreme heaviness, blast beats, deep growling textures, dark atmosphere',
    psychedelic: 'swirling effects, trippy textures, expanded consciousness soundscape',
    'arena rock': 'anthemic melodies, big production, stadium-filling energy',
    'blues-rock': 'blues-inflected guitar work, rock energy, soulful expression',
    'glam rock': 'flashy melodic rock, theatrical flair, catchy hooks',
    rockabilly: 'slap bass, twangy guitar, uptempo swing, 1950s rock energy',
    surf: 'reverb-drenched guitar, rhythmic drive, sunny California atmosphere',
    'southern rock': 'dual guitar harmonies, blues-rock foundation, southern storytelling',
    'singer/songwriter': 'intimate acoustic performance, personal lyrics, warm simplicity',
    'goth rock': 'dark atmosphere, deep bass, ethereal vocals, post-punk shadows',
    steampunk: 'Victorian-industrial fusion, mechanical textures, theatrical adventure',

    // Hip-Hop / Rap
    'hip-hop': 'boom-bap undertones, deep bass, rhythmic backbone',
    'old school rap': 'classic boom-bap, turntablism, funky samples, golden-era feel',
    'alternative rap': 'conscious lyrics vibe, eclectic samples, experimental hip-hop',
    'east coast rap': 'boom-bap drums, jazz samples, lyrical complexity',
    'west coast rap': 'G-funk synths, deep bass, laid-back West Coast groove',
    'dirty south': 'heavy 808 bass, crunk energy, southern bounce',
    'gangsta rap': 'hard-hitting beats, deep bass, intense urban atmosphere',
    'latin rap': 'Latin rhythms fused with hip-hop beats, bilingual energy',
    'underground rap': 'raw production, experimental beats, independent spirit',
    bounce: 'call-and-response chants, heavy bass, New Orleans party energy',

    // Country & Folk
    country: 'acoustic guitar warmth, gentle steel, pastoral atmosphere',
    folk: 'acoustic instruments, gentle fingerpicking, natural warmth',
    americana: 'roots-influenced, acoustic warmth, heartland storytelling',
    bluegrass: 'banjo, fiddle, mandolin, fast picking, Appalachian tradition',
    'honky tonk': 'twangy guitar, barroom piano, classic country swagger',
    'outlaw country': 'rebellious spirit, rough-edged country-rock, storytelling grit',
    'country gospel': 'faith-inspired country, warm harmonies, spiritual sincerity',
    'urban cowboy': 'polished country-pop crossover, smooth production',

    // Reggae
    reggae: 'offbeat rhythmic feel, warm bass, relaxed island atmosphere',
    dancehall: 'digital riddims, energetic Caribbean groove, bass-heavy production',
    dub: 'heavy reverb, echo effects, stripped-down bass-heavy reggae textures',
    'roots reggae': 'conscious roots rhythm, one-drop beat, warm organic bass',
    ska: 'upbeat offbeat guitar, walking bass, brass section, Jamaican energy',

    // Latin
    'bossa nova': 'gentle Brazilian guitar, soft percussion, intimate jazz-samba groove',
    brazilian: 'samba rhythms, tropical percussion, warm melodic joy',
    salsa: 'clave rhythm, brass, piano montunos, vibrant Afro-Cuban dance energy',
    reggaeton: 'dembow rhythm, heavy bass, urban Latin production',
    latin: 'Latin percussion, rhythmic energy, warm melodic sensibility',

    // World
    world: 'ethnic instruments, global textures, cross-cultural harmonic palette',
    qawwali: 'devotional Sufi singing, hand-clapping rhythm, ecstatic spiritual energy',

    // K-Pop / J-Pop
    'k-pop': 'polished K-pop production, catchy hooks, dynamic arrangement',
    'j-pop': 'bright Japanese pop melodies, energetic production, playful dynamics',
    'j-rock': 'Japanese rock energy, dynamic guitars, melodic intensity',

    // Christian & Inspirational
    ccm: 'contemporary Christian music, uplifting melodies, faith-centered warmth',
    'christian rock': 'rock energy with faith-inspired themes, positive intensity',
    praise: 'worship-style progressions, uplifting dynamics, communal energy',
    worship: 'worship-style progressions, uplifting dynamics, communal energy',

    // Easy Listening
    lounge: 'cocktail-hour sophistication, smooth arrangements, relaxed elegance',
    swing: 'big band swing rhythm, energetic brass, dance-floor joy',
    bop: 'bebop jazz complexity, fast harmonic movement, virtuosic energy',

    // Cinematic
    cinematic: 'orchestral swells, dramatic pacing, wide stereo field',

    // Disney & Holiday
    disney: 'magical orchestral arrangements, whimsical melodies, storybook wonder',
    christmas: 'festive warmth, sleigh bells, classic holiday cheer',
    halloween: 'eerie atmosphere, minor keys, suspenseful textures',

    // Fitness
    fitness: 'high-energy tempo, driving beat, motivational intensity',
    workout: 'high-energy tempo, driving beat, motivational intensity',
    exercise: 'high-energy tempo, driving beat, motivational intensity',
  };

  for (const [key, hint] of Object.entries(genreHints)) {
    if (g.includes(key) || key.includes(g)) {
      return hint;
    }
  }

  return `${genre} style and instrumentation`;
}

function getMultiGenreHints(genreField: string): { names: string[]; hints: string[] } {
  const names = genreField
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  const hints = names.map((g) => getGenreHint(g));
  return { names, hints };
}

/* ─── Public Interface ─── */

export interface TherapyPromptEngine {
  buildPrompt(request: TherapyRequest, frequency: TherapyFrequencyTarget): TherapyPromptPayload;
}

export const therapyPromptEngine: TherapyPromptEngine = {
  buildPrompt(request: TherapyRequest, frequency: TherapyFrequencyTarget): TherapyPromptPayload {
    const intensity = request.intensity ?? 'medium';
    const goalDesc = goalMusicDescriptors[request.goal];
    const { names: genreNames, hints: genreHintList } = getMultiGenreHints(request.genre);
    const intensityDesc = intensityDescriptors[intensity];
    const genreLabel = genreNames.join(' + ');
    const uniqueHints = [...new Set(genreHintList)];

    const parts: string[] = [
      `A therapeutic ${genreLabel} music track designed for ${request.goal.replace(/_/g, ' ')}.`,
      `${goalDesc}.`,
      `Genre blend: ${uniqueHints.join('; ')}.`,
      `Intensity: ${intensityDesc}.`,
    ];

    // Add emotion-specific guidance
    if (request.goal === 'emotion_relief' && request.emotion) {
      const emotionDesc = emotionDescriptors[request.emotion];
      if (emotionDesc) {
        parts.push(`Emotional approach: ${emotionDesc}.`);
      }
    }

    // Add body area-specific guidance for pain relief
    if (request.goal === 'pain_relief' && request.bodyArea) {
      const bodyDesc = bodyAreaDescriptors[request.bodyArea];
      if (bodyDesc) {
        parts.push(`Physical targeting: ${bodyDesc}.`);
      }
    }

    // Cultural healing mode guidance
    if (request.culturalMode) {
      const mode = culturalModeDescriptors[request.culturalMode];
      if (mode) {
        parts.push(`Cultural tradition: ${mode.label}. ${mode.musicalGuidance}`);
        const goalSpecific = mode.goalRefinement[request.goal];
        if (goalSpecific) {
          parts.push(`Tradition-specific guidance: ${goalSpecific}`);
        }
      }
    }

    // Frequency context for the AI model
    parts.push(
      `This track will be layered with a ${frequency.hz} Hz ${frequency.band} binaural beat${frequency.solfeggioHz ? ` and a ${frequency.solfeggioHz} Hz Solfeggio tone` : ''}.`,
    );
    parts.push(
      'Compose to complement these frequencies — avoid clashing tonal content in the sub-bass range.',
    );

    // Universal constraints
    parts.push(
      'No vocals. Smooth transitions. No sudden dynamic changes. Suitable for therapeutic listening with headphones.',
    );

    const prompt = parts.join(' ');
    return { prompt };
  },
};
