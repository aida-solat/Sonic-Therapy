import Link from 'next/link';

const features = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
    title: 'Personalized therapy sessions',
    text: 'Describe your condition, choose your music genre, set a session length. The platform maps your goal to brainwave frequencies and generates a therapy track tailored to you.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 10v3" />
        <path d="M6 6v11" />
        <path d="M10 3v18" />
        <path d="M14 8v7" />
        <path d="M18 5v13" />
        <path d="M22 10v3" />
      </svg>
    ),
    title: 'Binaural beat entrainment',
    text: 'Stereo sine tone pairs layered under AI music. 3-phase session phasing: induction ramp, deepening hold at therapeutic frequency, and gentle emergence back to alert state.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: 'Cultural healing traditions',
    text: 'Chinese Five-Element pentatonic scales, Indian Raga Chikitsa, and Ottoman Maqam quarter-tone systems — each with goal-specific musical guidance injected into the AI prompt.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    title: 'AI music generation',
    text: 'Multi-model fallback (MusicGen → OpenAI) with an intelligent prompt engine. RAG-augmented retrieval over a curated music knowledge base for distinct, high-quality outputs.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    title: 'Professional audio pipeline',
    text: 'FFmpeg-based normalization, Solfeggio tone mixing, binaural beat layering, fade-in/fade-out, watermarking, and dual-format export (MP3 + lossless WAV).',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: 'Full product surface',
    text: 'Supabase auth, Stripe billing with subscription plans, API key management, quota enforcement, track evaluation, and a polished studio dashboard.',
  },
];

const plans = [
  {
    name: 'Free',
    quota: '1 session/day',
    features: ['MP3 export', 'Watermarked output', 'All therapy goals'],
    highlight: false,
  },
  {
    name: 'Basic',
    quota: '5 sessions/day',
    features: ['MP3 export', 'No watermark', 'Cultural healing modes'],
    highlight: false,
  },
  {
    name: 'Pro',
    quota: '20 sessions/day',
    features: ['MP3 + WAV export', 'No watermark', 'Priority generation'],
    highlight: true,
  },
  {
    name: 'Ultra',
    quota: '100 sessions/day',
    features: ['MP3 + WAV export', 'Commercial license', 'Full API access'],
    highlight: false,
  },
];

const techStack = [
  { name: 'Fastify', role: 'API server' },
  { name: 'Next.js', role: 'Frontend' },
  { name: 'Supabase', role: 'Auth & DB' },
  { name: 'Stripe', role: 'Billing' },
  { name: 'MusicGen', role: 'Primary AI' },
  { name: 'OpenAI', role: 'Fallback AI' },
  { name: 'FFmpeg', role: 'Audio pipeline' },
  { name: 'TypeScript', role: 'Language' },
  { name: 'Tailwind', role: 'Styling' },
];

export default function HomePage() {
  return (
    <main className="app-shell space-y-16 md:space-y-24 pb-16">
      {/* ── Navbar ── */}
      <header className="navbar ambient-surface px-5 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 10v3" />
                <path d="M6 6v11" />
                <path d="M10 3v18" />
                <path d="M14 8v7" />
                <path d="M18 5v13" />
                <path d="M22 10v3" />
              </svg>
            </div>
            <span className="font-display text-lg text-base-content">Sonic Therapy</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn btn-ghost btn-sm text-base-content/60" href="#features">
            Features
          </a>
          <a className="btn btn-ghost btn-sm text-base-content/60" href="#how-it-works">
            How It Works
          </a>
          <a className="btn btn-ghost btn-sm text-base-content/60" href="#pricing">
            Pricing
          </a>
          <Link className="btn btn-ghost btn-sm text-base-content/60" href="/docs">
            Docs
          </Link>
          <Link className="btn btn-primary btn-sm" href="/dashboard">
            Open Studio
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 mb-8">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs tracking-wide text-primary">Built by Deciwa</span>
        </div>

        <h1 className="editorial-title max-w-4xl text-4xl md:text-6xl lg:text-7xl">
          Personalized music therapy powered by AI
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-base-content/60 md:text-lg">
          Tell us what hurts. Pick the music you love. Get a therapy session built just for you —
          with binaural beat entrainment, Solfeggio frequencies, and cultural healing traditions.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-primary btn-lg" href="/dashboard">
            Start a Session
          </Link>
          <a
            className="btn btn-outline btn-lg border-primary/30 text-base-content"
            href="#how-it-works"
          >
            See how it works
          </a>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-4 md:flex md:gap-12">
          {[
            { value: '20', label: 'Therapy goals' },
            { value: '5', label: 'Brainwave bands' },
            { value: '3', label: 'Cultural modes' },
            { value: '3-Phase', label: 'Entrainment' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl text-primary">{stat.value}</p>
              <p className="text-xs text-base-content/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="text-center mb-12">
          <p className="editorial-kicker mb-3">How it works</p>
          <h2 className="editorial-title text-3xl md:text-4xl">
            Your condition. Your music. Your session.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Describe your condition',
              text: 'Choose from 20 therapeutic goals — chronic pain, insomnia, anxiety, ADHD focus, migraine relief, and more.',
            },
            {
              step: '02',
              title: 'Pick your music',
              text: 'Select the genre you love — jazz, classical, ambient, electronic, lo-fi. The AI generates music in your style.',
            },
            {
              step: '03',
              title: 'Customize your session',
              text: 'Set duration, intensity, and optionally choose a cultural healing tradition — Chinese, Indian, or Ottoman.',
            },
            {
              step: '04',
              title: 'Listen & heal',
              text: 'Receive a personalized therapy track with binaural beats, Solfeggio tones, and 3-phase brainwave entrainment.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-base-300/70 bg-base-200/40 p-6"
            >
              <span className="font-display text-5xl text-primary/10 absolute top-4 right-5">
                {item.step}
              </span>
              <div className="relative">
                <h3 className="font-display text-lg text-base-content mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-base-content/55">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-20">
        <div className="text-center mb-12">
          <p className="editorial-kicker mb-3">Under the hood</p>
          <h2 className="editorial-title text-3xl md:text-4xl">Science meets engineering</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group rounded-2xl border border-base-300/70 bg-base-200/50 p-6 transition-colors hover:border-primary/30 hover:bg-base-200/70"
            >
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
                  {f.icon}
                </div>
                <h3 className="font-display text-lg text-base-content mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-base-content/55">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Therapy Science ── */}
      <section className="scroll-mt-20">
        <div className="text-center mb-12">
          <p className="editorial-kicker mb-3">The science</p>
          <h2 className="editorial-title text-3xl md:text-4xl">Research-grounded therapy</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Brainwave Entrainment',
              items: [
                'Delta (0.1–4 Hz) — deep sleep, pain relief',
                'Theta (4–8 Hz) — meditation, creativity',
                'Alpha (8–13 Hz) — relaxation, calm focus',
                'Beta (13–30 Hz) — active focus, alertness',
                'Gamma (30–100 Hz) — peak cognition',
              ],
            },
            {
              title: 'Solfeggio Frequencies',
              items: [
                '174 Hz — pain reduction',
                '285 Hz — tissue healing',
                '396 Hz — liberating fear',
                '528 Hz — DNA repair, transformation',
                '639 Hz — harmonizing relationships',
                '741 Hz — detox, problem solving',
                '852 Hz — awakening intuition',
                '963 Hz — spiritual connection',
              ],
            },
            {
              title: 'Session Phasing',
              items: [
                'Induction (15%) — ramp from alert to target',
                'Deepening (70%) — hold therapeutic frequency',
                'Emergence (15%) — gentle ramp back to alpha',
                'Smart tempo — 55–100 BPM per goal',
                'Piecewise-linear frequency sweeps',
              ],
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-base-300/70 bg-base-200/40 p-6"
            >
              <h3 className="font-display text-lg text-base-content mb-4">{card.title}</h3>
              <ul className="space-y-2">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-base-content/55">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/40 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="scroll-mt-20">
        <div className="text-center mb-12">
          <p className="editorial-kicker mb-3">Pricing</p>
          <h2 className="editorial-title text-3xl md:text-4xl">Start free, scale as you grow</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 transition-colors ${
                plan.highlight
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-base-300/70 bg-base-200/40'
              }`}
            >
              {plan.highlight && (
                <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] uppercase tracking-wider text-primary">
                  Popular
                </span>
              )}
              <h3 className="font-display text-2xl text-base-content">{plan.name}</h3>
              <p className="mt-1 text-sm text-primary font-medium">{plan.quota}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-base-content/60">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-success shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`btn btn-sm w-full mt-5 ${plan.highlight ? 'btn-primary' : 'btn-outline border-base-300/70 text-base-content/70'}`}
              >
                {plan.name === 'Free' ? 'Get started' : `Choose ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="stack" className="scroll-mt-20">
        <div className="text-center mb-12">
          <p className="editorial-kicker mb-3">Tech stack</p>
          <h2 className="editorial-title text-3xl md:text-4xl">Built with modern tools</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 rounded-xl border border-base-300/70 bg-base-200/30 px-5 py-3"
            >
              <span className="font-display text-base text-base-content">{t.name}</span>
              <span className="text-xs text-base-content/35">{t.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-base-300/70 pt-8 text-center">
        <p className="text-sm text-base-content/35">
          Designed & built by <span className="text-primary/70 font-medium">Deciwa</span>
        </p>
        <p className="mt-1 text-xs text-base-content/25">
          Sonic Therapy Platform &mdash; Personalized AI Music Therapy
        </p>
      </footer>
    </main>
  );
}
