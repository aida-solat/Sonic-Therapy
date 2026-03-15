'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { api } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { TherapyPanel } from '@/components/therapy-panel';
import { useToast } from '@/components/toast';
import type {
  AccountApiKeyItem,
  AccountMeResponse,
  AccountTrackItem,
  GenerateRequest,
  HealthResponse,
  IntensityLevel,
  RevealedKey,
  TrackRatingRequest,
} from '@/lib/types';

const moods = [
  'calm',
  'focus',
  'energetic',
  'dark',
  'dreamy',
  'romantic',
  'melancholy',
  'uplifting',
];
const styles = [
  'ambient',
  'lofi',
  'cinematic',
  'electronic',
  'classical',
  'nature',
  'jazz',
  'chillhop',
];
const intensities: IntensityLevel[] = ['soft', 'medium', 'high'];
const paidPlans = ['basic', 'pro', 'ultra'] as const;

const defaultRequest: GenerateRequest = {
  mood: 'calm',
  style: 'ambient',
  tempo: 72,
  length: 60,
  intensity: 'medium',
};

const baseUrlDefault = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function statusTone(status?: string): 'good' | 'warn' | 'bad' {
  if (status === 'ok' || status === 'healthy') return 'good';
  if (status === 'degraded') return 'warn';
  return 'bad';
}

function mergeRawKey(keys: AccountApiKeyItem[], revealedKeys: Record<string, RevealedKey>) {
  return keys.map((item) => ({
    ...item,
    rawKey: revealedKeys[item.id]?.apiKey,
  }));
}

function resolveHealthChecks(health: HealthResponse | null) {
  const checks = health?.checks;

  return [
    { label: 'Service', status: health?.status },
    { label: 'Database', status: checks?.database?.status ?? health?.db?.status },
    { label: 'Storage', status: checks?.storage?.status ?? health?.storage?.status },
    { label: 'Provider', status: checks?.provider?.status ?? health?.provider?.status },
  ];
}

function SectionSkeleton({ lines = 3, compact = false }: { lines?: number; compact?: boolean }) {
  return (
    <div className={`ambient-panel p-5 ${compact ? 'space-y-3' : 'space-y-4'}`} aria-hidden="true">
      <div className="skeleton h-3 w-28 bg-base-300/70" />
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`skeleton bg-base-300/65 ${compact ? 'h-4' : 'h-5'} ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ambient-empty">
      <p className="editorial-kicker">Waiting for activity</p>
      <h3 className="ambient-empty-title mt-3">{title}</h3>
      <p className="ambient-empty-copy">{copy}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function ShieldIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
    </svg>
  );
}

function KeyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
      <path d="M9.5 14.5 3 21m4-4 2 2m1-5 2 2" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function SparkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </svg>
  );
}

const sections = {
  generate: 'generate-section',
  therapy: 'therapy-section',
  library: 'library-section',
  access: 'access-workflow-section',
  environment: 'environment-section',
  billing: 'billing-section',
} as const;

type GenerateTab = 'standard' | 'therapy';

export function DashboardApp() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(baseUrlDefault);
  const [manualApiKey, setManualApiKey] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [requestState, setRequestState] = useState<GenerateRequest>(defaultRequest);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [account, setAccount] = useState<AccountMeResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [accountKeys, setAccountKeys] = useState<AccountApiKeyItem[]>([]);
  const [tracks, setTracks] = useState<AccountTrackItem[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, RevealedKey>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateTab, setGenerateTab] = useState<GenerateTab>('standard');
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<'' | 'standard' | 'therapy'>('');
  const [libraryMoodFilter, setLibraryMoodFilter] = useState('');
  const [libraryStyleFilter, setLibraryStyleFilter] = useState('');
  const generateStartRef = useRef<number>(0);
  const generateEstRef = useRef<number>(0);

  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      if (libraryTypeFilter && (t.trackType ?? 'standard') !== libraryTypeFilter) return false;
      if (libraryMoodFilter && t.metadata.mood !== libraryMoodFilter) return false;
      if (libraryStyleFilter && t.metadata.style !== libraryStyleFilter) return false;
      if (librarySearch) {
        const q = librarySearch.toLowerCase();
        const searchable = [
          t.metadata.mood,
          t.metadata.style,
          `${t.metadata.tempo} bpm`,
          `${t.metadata.duration}s`,
          t.metadata.plan,
          t.metadata.intensity,
          t.trackType ?? 'standard',
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [tracks, librarySearch, libraryTypeFilter, libraryMoodFilter, libraryStyleFilter]);

  const LIBRARY_PAGE_SIZE = 3;
  const visibleTracks = libraryExpanded
    ? filteredTracks
    : filteredTracks.slice(0, LIBRARY_PAGE_SIZE);
  const hasMoreTracks = filteredTracks.length > LIBRARY_PAGE_SIZE && !libraryExpanded;

  // Simulated progress during generation
  useEffect(() => {
    if (busy !== 'generate') {
      if (generateProgress > 0 && generateProgress < 100) {
        setGenerateProgress(100);
        const t = setTimeout(() => setGenerateProgress(0), 600);
        return () => clearTimeout(t);
      }
      return;
    }

    // Estimate: ~0.5s per second of track length + 10s base overhead
    const estimatedSeconds = requestState.length * 0.5 + 10;
    generateStartRef.current = Date.now();
    generateEstRef.current = estimatedSeconds;
    setGenerateProgress(0);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - generateStartRef.current) / 1000;
      // Ease-out curve: fast start, slows near 92% (never reaches 100 until done)
      const raw = (elapsed / estimatedSeconds) * 100;
      const eased = Math.min(92, raw * (1 - raw / 400));
      setGenerateProgress(Math.round(eased));
    }, 300);

    return () => clearInterval(interval);
  }, [busy]);

  const handleAudioPlay = useCallback((trackId: string) => {
    audioRefs.current.forEach((el, id) => {
      if (id !== trackId && !el.paused) {
        el.pause();
      }
    });
  }, []);

  // Track rating state
  const [ratingTrackId, setRatingTrackId] = useState<string | null>(null);
  const [ratingValues, setRatingValues] = useState<TrackRatingRequest>({
    satisfaction: 0,
    moodAccuracy: 0,
    styleAccuracy: 0,
    audioQuality: 0,
  });
  const [ratedTracks, setRatedTracks] = useState<Record<string, number>>({});

  async function handleRateTrack(trackId: string) {
    if (!session?.access_token) return;
    if (
      ratingValues.satisfaction < 1 ||
      ratingValues.moodAccuracy < 1 ||
      ratingValues.styleAccuracy < 1 ||
      ratingValues.audioQuality < 1
    ) {
      toast('warning', 'Please rate all four categories (1–5 stars).');
      return;
    }

    setBusy('rate');
    try {
      await api.rateTrack(baseUrl, session.access_token, trackId, ratingValues);
      setRatedTracks((prev) => ({ ...prev, [trackId]: ratingValues.satisfaction }));
      setRatingTrackId(null);
      setRatingValues({ satisfaction: 0, moodAccuracy: 0, styleAccuracy: 0, audioQuality: 0 });
      toast('success', 'Rating saved!');
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to save rating');
    } finally {
      setBusy(null);
    }
  }

  const hydratedKeys = useMemo(
    () => mergeRawKey(accountKeys, revealedKeys),
    [accountKeys, revealedKeys],
  );
  const resolvedHealth = useMemo(() => resolveHealthChecks(health), [health]);
  const isInitialHealthLoading = busy === 'health' && health === null;
  const isInitialAccountLoading =
    busy === 'account' &&
    session !== null &&
    account === null &&
    accountKeys.length === 0 &&
    tracks.length === 0;
  const hasSelectedKey = manualApiKey.trim().length > 0;
  const isSupabaseConfigured = supabase !== null;
  const isHealthBusy = busy === 'health';
  const isAccountBusy = busy === 'account';
  const isSignOutBusy = busy === 'signout';
  const isKeysBusy = busy === 'keys';
  const isGenerateBusy = busy === 'generate';
  const isCheckoutBusy = busy === 'checkout';
  const isPortalBusy = busy === 'portal';
  const isBillingBusy = isCheckoutBusy || isPortalBusy;
  const isSessionReady = Boolean(session);
  const isGenerationReady = isSessionReady && hasSelectedKey;
  const currentPlan = account?.plan ?? 'free';
  const remainingToday = account?.remainingToday ?? '—';
  const currentModeLabel = isGenerationReady
    ? 'Ready to generate'
    : isSessionReady
      ? 'Awaiting key selection'
      : 'Read-only';
  const summaryItems = [
    { label: 'Plan', value: currentPlan, tone: 'text-primary' },
    { label: 'Remaining today', value: String(remainingToday), tone: 'text-base-content' },
    { label: 'Active keys', value: String(accountKeys.length), tone: 'text-secondary' },
    { label: 'Tracks', value: String(tracks.length), tone: 'text-accent' },
    { label: 'Mode', value: currentModeLabel, tone: 'text-base-content' },
  ];
  const readinessItems = [
    {
      label: 'Session',
      ready: isSessionReady,
      text: isSessionReady
        ? 'Authenticated'
        : isSupabaseConfigured
          ? 'Sign in required'
          : 'Supabase unavailable',
    },
    {
      label: 'API key',
      ready: hasSelectedKey,
      text: hasSelectedKey ? 'Selected for generate' : 'No key selected',
    },
    {
      label: 'API health',
      ready: statusTone(health?.status) === 'good',
      text: health?.status ?? 'Unknown',
    },
  ];

  useEffect(() => {
    const storedBaseUrl = window.localStorage.getItem('ambient-web:base-url');
    const storedApiKey = window.localStorage.getItem('ambient-web:manual-api-key');
    const storedRevealedKeys = window.localStorage.getItem('ambient-web:revealed-keys');

    if (storedBaseUrl) setBaseUrl(storedBaseUrl);
    if (storedApiKey) setManualApiKey(storedApiKey);
    if (storedRevealedKeys)
      setRevealedKeys(JSON.parse(storedRevealedKeys) as Record<string, RevealedKey>);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('ambient-web:base-url', baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    window.localStorage.setItem('ambient-web:manual-api-key', manualApiKey);
  }, [manualApiKey]);

  useEffect(() => {
    window.localStorage.setItem('ambient-web:revealed-keys', JSON.stringify(revealedKeys));
  }, [revealedKeys]);

  useEffect(() => {
    if (!supabase) {
      setSessionChecked(true);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null);
        setSessionChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Redirect to /login when not authenticated
  useEffect(() => {
    if (sessionChecked && !session) {
      router.replace('/login');
    }
  }, [sessionChecked, session, router]);

  async function refreshHealth() {
    setBusy('health');

    try {
      setHealth(await api.getHealth(baseUrl));
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to load health status');
    } finally {
      setBusy(null);
    }
  }

  async function refreshAccount() {
    if (!session?.access_token) {
      setAccount(null);
      setAccountKeys([]);
      setTracks([]);
      return;
    }

    setBusy('account');

    try {
      const [nextAccount, nextKeys, nextTracks] = await Promise.all([
        api.getAccountMe(baseUrl, session.access_token),
        api.listAccountKeys(baseUrl, session.access_token),
        api.listAccountTracks(baseUrl, session.access_token),
      ]);

      setAccount(nextAccount);
      setAccountKeys(nextKeys.items);
      setTracks(nextTracks.items);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Failed to load account data';
      const isColdStart = msg === 'Failed to fetch' || msg.includes('network');
      toast(
        'error',
        isColdStart
          ? 'API is waking up (free tier cold start). Please refresh in a few seconds.'
          : msg,
      );
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, [baseUrl]);

  useEffect(() => {
    if (!session) {
      setAccount(null);
      setAccountKeys([]);
      setTracks([]);
      return;
    }

    void refreshAccount();
  }, [session]);

  // Auto-select first available API key when no key is set
  useEffect(() => {
    if (manualApiKey) return;
    const firstKey = hydratedKeys.find((k) => k.rawKey && k.status === 'active');
    if (firstKey?.rawKey) setManualApiKey(firstKey.rawKey);
  }, [hydratedKeys]);

  async function handleSignOut() {
    if (!supabase) return;

    setBusy('signout');

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setManualApiKey('');
      router.replace('/login');
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Sign-out failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) {
      toast('warning', 'Sign in before creating an API key.');
      return;
    }

    setBusy('keys');

    try {
      const created = await api.createAccountKey(baseUrl, session.access_token, keyLabel);

      setRevealedKeys((current) => ({
        ...current,
        [created.id]: {
          ...created,
          savedAt: new Date().toISOString(),
        },
      }));
      setManualApiKey(created.apiKey);
      toast('success', 'API key created and selected for generation.');
      await refreshAccount();
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to create API key');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!session?.access_token) {
      toast('warning', 'Sign in before deleting an API key.');
      return;
    }

    setBusy('keys');

    try {
      await api.deleteAccountKey(baseUrl, session.access_token, keyId);

      // Remove from local state immediately
      setAccountKeys((prev) => prev.filter((k) => k.id !== keyId));
      setRevealedKeys((prev) => {
        const next = { ...prev };
        // Clear manualApiKey if the deleted key was the one in use
        const deleted = next[keyId];
        if (deleted?.apiKey && deleted.apiKey === manualApiKey) {
          setManualApiKey('');
        }
        delete next[keyId];
        return next;
      });

      toast('success', 'API key deleted.');
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to delete API key');
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualApiKey) return;

    // Show busy spinner only after a short delay so fast errors (e.g. invalid key) skip it
    const spinnerTimer = setTimeout(() => setBusy('generate'), 350);

    try {
      const generated = await api.generateTrack(baseUrl, manualApiKey, requestState);
      clearTimeout(spinnerTimer);
      setBusy('generate'); // ensure progress UI is shown for success path

      setTracks((current) => [
        {
          id: generated.id,
          format: generated.format,
          createdAt: new Date().toISOString(),
          downloadUrl: generated.downloadUrl,
          downloadUrlWav: generated.downloadUrlWav,
          formatWav: generated.formatWav,
          trackType: 'standard',
          metadata: generated.metadata,
        },
        ...current,
      ]);
      toast('success', 'Track generated successfully.');

      if (session) {
        await refreshAccount();
      }
    } catch (cause) {
      clearTimeout(spinnerTimer);
      toast('error', cause instanceof Error ? cause.message : 'Track generation failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleCheckout(plan: (typeof paidPlans)[number]) {
    if (!session?.access_token) {
      toast('warning', 'Sign in before starting checkout.');
      return;
    }

    setBusy('checkout');

    try {
      const billingSession = await api.createCheckoutSession(baseUrl, session.access_token, {
        plan,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });

      window.location.href = billingSession.url;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to create checkout session');
      setBusy(null);
    }
  }

  async function handlePortal() {
    if (!session?.access_token) {
      toast('warning', 'Sign in before opening the billing portal.');
      return;
    }

    setBusy('portal');

    try {
      const billingSession = await api.createPortalSession(baseUrl, session.access_token, {
        returnUrl: window.location.href,
      });

      window.location.href = billingSession.url;
    } catch (cause) {
      toast(
        'error',
        cause instanceof Error ? cause.message : 'Failed to create billing portal session',
      );
      setBusy(null);
    }
  }

  function scrollToSection(sectionId: (typeof sections)[keyof typeof sections]) {
    const target = document.getElementById(sectionId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function copyToClipboard(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast('success', message);
    } catch {
      toast('error', 'Clipboard access failed. Copy the value manually.');
    }
  }

  // Full-page loading: wait for session check + initial account data before rendering anything
  const isFullPageLoading = !sessionChecked || (session && account === null && busy === 'account');

  if (isFullPageLoading) {
    return (
      <div className="app-shell space-y-5 md:space-y-6">
        {/* Header skeleton */}
        <div className="ambient-surface px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 border-b border-base-300/70 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="skeleton h-8 w-32 rounded-lg bg-base-300/70" />
              <div className="skeleton h-6 w-28 rounded-full bg-base-300/60" />
              <div className="skeleton h-6 w-24 rounded-full bg-base-300/60" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-16 bg-base-300/60" />
              <div className="skeleton h-8 w-36 bg-base-300/70" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-base-300/70 bg-base-100/40 px-4 py-3 space-y-2"
              >
                <div className="skeleton h-2.5 w-16 bg-base-300/60" />
                <div className="skeleton h-6 w-12 bg-base-300/70" />
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <section className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
          <div className="space-y-5">
            {/* Generate section skeleton */}
            <div className="card ambient-surface bg-base-200/70">
              <div className="card-body gap-5 p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-5 w-24 bg-base-300/70" />
                  <div className="flex gap-2">
                    <div className="skeleton h-8 w-28 rounded-lg bg-base-300/60" />
                    <div className="skeleton h-8 w-20 rounded-lg bg-base-300/60" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="skeleton h-3 w-16 bg-base-300/60" />
                      <div className="skeleton h-10 w-full rounded-lg bg-base-300/70" />
                    </div>
                  ))}
                </div>
                <div className="skeleton h-11 w-full rounded-xl bg-base-300/70 mt-2" />
              </div>
            </div>
            {/* Library section skeleton */}
            <div className="card ambient-surface bg-base-200/70">
              <div className="card-body gap-5 p-6 md:p-7">
                <div className="skeleton h-5 w-20 bg-base-300/70" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-base-300/70 bg-base-100/30 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="skeleton h-5 w-16 rounded-full bg-base-300/60" />
                          <div className="skeleton h-5 w-14 rounded-full bg-base-300/60" />
                        </div>
                        <div className="skeleton h-4 w-10 bg-base-300/60" />
                      </div>
                      <div className="skeleton h-10 w-full rounded-lg bg-base-300/70" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Sidebar skeleton */}
          <aside className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card ambient-surface bg-base-200/65">
                <div className="card-body gap-4 p-5">
                  <div className="skeleton h-4 w-20 bg-base-300/70" />
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full bg-base-300/60" />
                    <div className="skeleton h-3 w-3/4 bg-base-300/60" />
                  </div>
                </div>
              </div>
            ))}
          </aside>
        </section>

        <footer className="mt-8 pb-4 text-center">
          <p className="text-xs text-base-content/30">
            Designed & built by <span className="text-primary/50">Deciwa</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell space-y-5 md:space-y-6">
      {session && (
        <header className="ambient-surface px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 border-b border-base-300/70 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="badge badge-outline border-primary/40 px-4 py-3 text-primary">
                  Studio console
                </div>
                <div
                  className={`ambient-status-chip ${isSessionReady ? 'text-success' : 'text-warning'}`}
                >
                  {isSessionReady ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldIcon className="h-3.5 w-3.5" />
                  )}
                  <span>{isSessionReady ? 'Session active' : 'Session not loaded'}</span>
                </div>
                <div
                  className={`ambient-status-chip ${hasSelectedKey ? 'text-primary' : 'text-base-content/70'}`}
                >
                  {hasSelectedKey ? (
                    <KeyIcon className="h-3.5 w-3.5" />
                  ) : (
                    <SparkIcon className="h-3.5 w-3.5" />
                  )}
                  <span>{hasSelectedKey ? 'Key selected' : 'Key required'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="editorial-kicker">Studio</p>
                <h1 className="editorial-title text-[1.8rem] md:text-[2.1rem]">Overview</h1>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-base-300/70 bg-base-100/40 px-4 py-3"
                >
                  <span className="text-[0.65rem] uppercase tracking-wider text-base-content/45">
                    {item.label}
                  </span>
                  <p className={`font-display text-xl leading-tight mt-1 ${item.tone}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-1">
              {isInitialHealthLoading ? (
                <span className="text-xs text-base-content/40">checking...</span>
              ) : (
                <>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      resolvedHealth.every((h) => statusTone(h.status) === 'good')
                        ? 'bg-success'
                        : resolvedHealth.some((h) => statusTone(h.status) === 'bad')
                          ? 'bg-error'
                          : 'bg-warning'
                    }`}
                  />
                  <span className="text-xs text-base-content/55">
                    {resolvedHealth.every((h) => statusTone(h.status) === 'good')
                      ? 'All systems operational'
                      : resolvedHealth
                          .filter((h) => statusTone(h.status) !== 'good')
                          .map((h) => h.label)
                          .join(', ') + ' degraded'}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Main app: logged-in layout ── */}
      {session && (
        <section className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
          <div className="space-y-5">
            {/* ── Generate: the hero section ── */}
            <section
              id={sections.generate}
              className="card ambient-surface scroll-mt-24 bg-base-200/70"
            >
              <div className="card-body gap-5 p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-xl text-base-content">Create a track</h2>
                    <div className="tabs tabs-boxed bg-base-300/40 p-1 rounded-xl">
                      <button
                        type="button"
                        className={`tab tab-sm rounded-lg ${
                          generateTab === 'standard'
                            ? 'tab-active bg-primary text-primary-content'
                            : 'text-base-content/60'
                        }`}
                        onClick={() => setGenerateTab('standard')}
                      >
                        Ambient Music
                      </button>
                      <button
                        type="button"
                        className={`tab tab-sm rounded-lg ${
                          generateTab === 'therapy'
                            ? 'tab-active bg-primary text-primary-content'
                            : 'text-base-content/60'
                        }`}
                        onClick={() => setGenerateTab('therapy')}
                      >
                        Therapy
                      </button>
                    </div>
                  </div>
                  {!hasSelectedKey && (
                    <span className="text-xs text-warning">
                      No API key — create one in Settings
                    </span>
                  )}
                </div>

                {generateTab === 'therapy' ? (
                  <TherapyPanel
                    baseUrl={baseUrl}
                    apiKey={manualApiKey}
                    onTrackGenerated={() => void refreshAccount()}
                  />
                ) : isGenerateBusy ? (
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
                        Creating your ambient track
                      </h3>
                      <p className="text-sm text-base-content/50">
                        Generating {requestState.style} {requestState.mood} music at{' '}
                        {requestState.tempo} BPM...
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-primary">Processing...</span>
                        <span className="tabular-nums font-medium text-base-content">
                          {generateProgress}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-base-300/50">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${generateProgress}%` }}
                        />
                      </div>
                      <p className="text-center text-xs text-base-content/40">
                        {(() => {
                          const remaining = Math.max(
                            0,
                            Math.round(
                              generateEstRef.current -
                                (Date.now() - generateStartRef.current) / 1000,
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
                ) : (
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => void handleGenerate(event)}
                  >
                    <label className="form-control w-full">
                      <div className="mb-2">
                        <span className="text-sm text-base-content/70">Mood</span>
                      </div>
                      <select
                        className="select select-bordered bg-base-100"
                        value={requestState.mood}
                        onChange={(event) =>
                          setRequestState((current) => ({
                            ...current,
                            mood: event.target.value,
                          }))
                        }
                      >
                        {moods.map((mood) => (
                          <option key={mood} value={mood}>
                            {mood}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control w-full">
                      <div className="mb-2">
                        <span className="text-sm text-base-content/70">Style</span>
                      </div>
                      <select
                        className="select select-bordered bg-base-100"
                        value={requestState.style}
                        onChange={(event) =>
                          setRequestState((current) => ({
                            ...current,
                            style: event.target.value,
                          }))
                        }
                      >
                        {styles.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control w-full">
                      <div className="mb-2">
                        <span className="text-sm text-base-content/70">Tempo</span>
                      </div>
                      <input
                        className="input input-bordered bg-base-100"
                        type="number"
                        min={1}
                        value={requestState.tempo}
                        onChange={(event) =>
                          setRequestState((current) => ({
                            ...current,
                            tempo: Number(event.target.value),
                          }))
                        }
                      />
                    </label>

                    <label className="form-control w-full">
                      <div className="mb-2">
                        <span className="text-sm text-base-content/70">Length</span>
                      </div>
                      <input
                        className="input input-bordered bg-base-100"
                        type="number"
                        min={1}
                        value={requestState.length}
                        onChange={(event) =>
                          setRequestState((current) => ({
                            ...current,
                            length: Number(event.target.value),
                          }))
                        }
                      />
                    </label>

                    <div className="md:col-span-2">
                      <div className="mb-2">
                        <span className="text-sm text-base-content/70">Intensity</span>
                      </div>
                      <div className="join flex w-full flex-wrap gap-2">
                        {intensities.map((intensity) => (
                          <button
                            key={intensity}
                            type="button"
                            className={`btn join-item ${requestState.intensity === intensity ? 'btn-primary' : 'btn-outline border-base-300/70 text-base-content'}`}
                            onClick={() =>
                              setRequestState((current) => ({
                                ...current,
                                intensity,
                              }))
                            }
                          >
                            {intensity}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <button
                        className="btn btn-primary w-full"
                        type="submit"
                        disabled={!manualApiKey}
                      >
                        Generate track
                      </button>
                      {!manualApiKey && (
                        <p className="mt-2 text-center text-xs text-warning">
                          Create or select an API key first to generate tracks.
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </section>
            <section
              id={sections.library}
              className="card ambient-surface scroll-mt-24 bg-base-200/70"
            >
              <div className="card-body gap-6 p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-base-content">Library</h2>
                  {tracks.length > 0 && (
                    <span className="text-xs text-base-content/40">
                      {filteredTracks.length} track{filteredTracks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {isInitialAccountLoading ? (
                  <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading recent tracks">
                    <SectionSkeleton lines={5} />
                    <SectionSkeleton lines={5} />
                  </div>
                ) : tracks.length === 0 ? (
                  <EmptyState
                    title="No tracks yet"
                    copy="Generated tracks will appear here with playback and download options."
                    action={
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => scrollToSection(sections.generate)}
                      >
                        Start with a generation
                      </button>
                    }
                  />
                ) : (
                  <>
                    {/* Filter bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[140px]">
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
                          placeholder="Search by mood, style, tempo..."
                          value={librarySearch}
                          onChange={(e) => {
                            setLibrarySearch(e.target.value);
                            setLibraryExpanded(false);
                          }}
                        />
                      </div>
                      <select
                        className="select select-bordered select-sm bg-base-100 w-28"
                        value={libraryTypeFilter}
                        onChange={(e) => {
                          setLibraryTypeFilter(e.target.value as '' | 'standard' | 'therapy');
                          setLibraryExpanded(false);
                        }}
                      >
                        <option value="">All types</option>
                        <option value="standard">Ambient</option>
                        <option value="therapy">Therapy</option>
                      </select>
                      <select
                        className="select select-bordered select-sm bg-base-100 w-28"
                        value={libraryMoodFilter}
                        onChange={(e) => {
                          setLibraryMoodFilter(e.target.value);
                          setLibraryExpanded(false);
                        }}
                      >
                        <option value="">All moods</option>
                        {moods.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select select-bordered select-sm bg-base-100 w-28"
                        value={libraryStyleFilter}
                        onChange={(e) => {
                          setLibraryStyleFilter(e.target.value);
                          setLibraryExpanded(false);
                        }}
                      >
                        <option value="">All styles</option>
                        {styles.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {(librarySearch ||
                        libraryTypeFilter ||
                        libraryMoodFilter ||
                        libraryStyleFilter) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-base-content/50"
                          onClick={() => {
                            setLibrarySearch('');
                            setLibraryTypeFilter('');
                            setLibraryMoodFilter('');
                            setLibraryStyleFilter('');
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {filteredTracks.length === 0 ? (
                      <p className="py-6 text-center text-sm text-base-content/40">
                        No tracks match your filters.
                      </p>
                    ) : (
                      <div
                        className={
                          libraryExpanded ? 'max-h-[600px] overflow-y-auto pr-1 scrollbar-thin' : ''
                        }
                      >
                        <div className="grid gap-4">
                          {visibleTracks.map((track, index) => (
                            <article
                              key={track.id}
                              className="rounded-2xl border border-base-300/70 bg-base-100/65 p-5 shadow-none"
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-display text-lg text-base-content capitalize">
                                      {track.metadata.mood} {track.metadata.style}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-base-content/45">
                                      Track #
                                      {filteredTracks.length - (libraryExpanded ? index : index)}
                                    </p>
                                  </div>
                                  <time className="shrink-0 text-xs text-base-content/50">
                                    {new Date(track.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </time>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {(track.trackType ?? 'standard') === 'therapy' ? (
                                    <span className="badge badge-sm badge-secondary">Therapy</span>
                                  ) : (
                                    <span className="badge badge-sm badge-secondary">Ambient</span>
                                  )}
                                  <span className="badge badge-sm badge-outline">
                                    {track.metadata.duration}s
                                  </span>
                                  <span className="badge badge-sm badge-outline">
                                    {track.metadata.tempo} BPM
                                  </span>
                                  <span className="badge badge-sm badge-outline">
                                    {track.metadata.plan}
                                  </span>
                                  <span className="badge badge-sm badge-outline">
                                    {track.metadata.watermarked ? 'watermarked' : 'clean'}
                                  </span>
                                </div>

                                {/* Therapy frequency chips */}
                                {(track.trackType ?? 'standard') === 'therapy' &&
                                  track.therapyFrequency && (
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="badge badge-sm badge-primary">
                                        {track.therapyFrequency.band.toUpperCase()} wave
                                      </span>
                                      <span className="badge badge-sm badge-outline border-primary/30 text-primary">
                                        Binaural beat · {track.therapyFrequency.hz} Hz
                                      </span>
                                      {track.therapyFrequency.solfeggioHz && (
                                        <span className="badge badge-sm badge-outline border-primary/30 text-primary">
                                          Solfeggio · {track.therapyFrequency.solfeggioHz} Hz
                                        </span>
                                      )}
                                      <span className="badge badge-sm badge-ghost text-base-content/50">
                                        {track.therapyFrequency.label}
                                      </span>
                                    </div>
                                  )}

                                {/* Inline audio player */}
                                <audio
                                  ref={(el) => {
                                    if (el) {
                                      audioRefs.current.set(track.id, el);
                                    } else {
                                      audioRefs.current.delete(track.id);
                                    }
                                  }}
                                  controls
                                  preload="metadata"
                                  className="w-full h-10 rounded-lg"
                                  src={track.downloadUrl}
                                  onPlay={() => handleAudioPlay(track.id)}
                                />

                                {/* Download + Rate buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary gap-1.5"
                                    onClick={() =>
                                      void downloadFile(
                                        track.downloadUrl,
                                        `${track.metadata.mood}-${track.metadata.style}-${track.id.slice(0, 8)}.mp3`,
                                      )
                                    }
                                  >
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
                                    >
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download MP3
                                  </button>
                                  {track.downloadUrlWav ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline border-primary/30 gap-1.5"
                                      onClick={() =>
                                        void downloadFile(
                                          track.downloadUrlWav!,
                                          `${track.metadata.mood}-${track.metadata.style}-${track.id.slice(0, 8)}.wav`,
                                        )
                                      }
                                    >
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
                                      >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                      </svg>
                                      Download WAV
                                    </button>
                                  ) : null}
                                  {ratedTracks[track.id] ? (
                                    <span className="btn btn-sm btn-ghost no-animation gap-1 text-warning cursor-default">
                                      {Array.from({ length: ratedTracks[track.id] }).map((_, i) => (
                                        <svg
                                          key={i}
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                          stroke="none"
                                        >
                                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                      ))}
                                      Rated
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost text-base-content/50 gap-1.5"
                                      onClick={() => {
                                        setRatingTrackId(
                                          ratingTrackId === track.id ? null : track.id,
                                        );
                                        setRatingValues({
                                          satisfaction: 0,
                                          moodAccuracy: 0,
                                          styleAccuracy: 0,
                                          audioQuality: 0,
                                        });
                                      }}
                                    >
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
                                      >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                      </svg>
                                      Rate
                                    </button>
                                  )}
                                </div>

                                {/* Inline rating panel */}
                                {ratingTrackId === track.id && (
                                  <div className="rounded-xl border border-base-300/70 bg-base-100/50 p-4 space-y-3">
                                    {(
                                      [
                                        { key: 'satisfaction' as const, label: 'Overall' },
                                        { key: 'moodAccuracy' as const, label: 'Mood accuracy' },
                                        { key: 'styleAccuracy' as const, label: 'Style accuracy' },
                                        { key: 'audioQuality' as const, label: 'Audio quality' },
                                      ] as const
                                    ).map((cat) => (
                                      <div
                                        key={cat.key}
                                        className="flex items-center justify-between gap-3"
                                      >
                                        <span className="text-xs text-base-content/60 w-28 shrink-0">
                                          {cat.label}
                                        </span>
                                        <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              className="p-0.5 transition-colors"
                                              onClick={() =>
                                                setRatingValues((prev) => ({
                                                  ...prev,
                                                  [cat.key]: star,
                                                }))
                                              }
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill={
                                                  star <= ratingValues[cat.key]
                                                    ? 'currentColor'
                                                    : 'none'
                                                }
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                className={
                                                  star <= ratingValues[cat.key]
                                                    ? 'text-warning'
                                                    : 'text-base-content/25'
                                                }
                                              >
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                              </svg>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary flex-1"
                                        disabled={busy === 'rate'}
                                        onClick={() => void handleRateTrack(track.id)}
                                      >
                                        {busy === 'rate' ? 'Saving...' : 'Submit Rating'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => setRatingTrackId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasMoreTracks && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm w-full text-primary"
                        onClick={() => setLibraryExpanded(true)}
                      >
                        Load more ({filteredTracks.length - LIBRARY_PAGE_SIZE} more track
                        {filteredTracks.length - LIBRARY_PAGE_SIZE !== 1 ? 's' : ''})
                      </button>
                    )}
                    {libraryExpanded && filteredTracks.length > LIBRARY_PAGE_SIZE && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs w-full text-base-content/40"
                        onClick={() => setLibraryExpanded(false)}
                      >
                        Show less
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            {/* ── Account ── */}
            <section className="card ambient-surface bg-base-200/65">
              <div className="card-body gap-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-base-content/70">Account</h2>
                  <button
                    type="button"
                    className="text-xs text-base-content/40 hover:text-base-content/70 transition-colors"
                    onClick={() => void handleSignOut()}
                    disabled={isSignOutBusy}
                  >
                    {isSignOutBusy ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
                <p className="truncate text-sm text-base-content">{session.user.email}</p>
                {account && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                      <p className="font-display text-lg text-primary">{account.plan}</p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                        Plan
                      </p>
                    </div>
                    <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                      <p className="font-display text-lg text-secondary">
                        {account.remainingToday}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                        Left today
                      </p>
                    </div>
                    <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                      <p className="font-display text-lg text-base-content">{account.usedToday}</p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                        Used
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── API Keys ── */}
            <section
              id={sections.access}
              className="card ambient-surface scroll-mt-24 bg-base-200/65"
            >
              <div className="card-body gap-4 p-5">
                <h2 className="text-sm font-medium text-base-content/70">API keys</h2>

                <form className="flex gap-2" onSubmit={(event) => void handleCreateKey(event)}>
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1 bg-base-100/80"
                    value={keyLabel}
                    onChange={(event) => setKeyLabel(event.target.value)}
                    placeholder="Key label"
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    type="submit"
                    disabled={isKeysBusy || !session}
                  >
                    {isKeysBusy ? '...' : 'Create'}
                  </button>
                </form>

                <div className="space-y-2">
                  {isInitialAccountLoading ? (
                    <SectionSkeleton lines={2} compact />
                  ) : hydratedKeys.length === 0 ? (
                    <p className="text-xs text-base-content/40 italic">No keys yet</p>
                  ) : (
                    hydratedKeys.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-base-300/70 bg-base-100/50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-base-content truncate">
                              {item.label || 'unlabeled'}
                            </span>
                            {item.rawKey && item.rawKey === manualApiKey && (
                              <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                                <span className="text-[0.6rem] uppercase tracking-wider text-success">
                                  in-use
                                </span>
                              </>
                            )}
                          </div>
                          {item.rawKey && (
                            <code className="text-[0.65rem] text-base-content/40">
                              {item.rawKey.slice(0, 12)}...
                            </code>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {item.rawKey && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-square"
                              title="Copy API key"
                              onClick={() => void copyToClipboard(item.rawKey ?? '', 'Copied!')}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square text-error/50 hover:text-error"
                            title="Delete API key"
                            onClick={() => void handleDeleteKey(item.id)}
                            disabled={busy === 'keys'}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ── Billing ── */}
            <section
              id={sections.billing}
              className="card ambient-surface scroll-mt-24 bg-base-200/65"
            >
              <div className="card-body gap-4 p-5">
                <h2 className="text-sm font-medium text-base-content/70">Billing</h2>
                <div className="grid gap-2">
                  {(
                    [
                      { plan: 'free' as const, desc: '2 tracks/day — MP3 watermarked' },
                      { plan: 'basic' as const, desc: '5 tracks/day — MP3 export' },
                      { plan: 'pro' as const, desc: '20 tracks/day — MP3 + WAV export' },
                      { plan: 'ultra' as const, desc: '100 tracks/day — WAV + commercial license' },
                    ] as const
                  ).map(({ plan, desc }) => (
                    <button
                      key={plan}
                      type="button"
                      className={`group flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        currentPlan === plan
                          ? 'border-primary/40 bg-primary/5 cursor-default'
                          : 'border-base-300/70 bg-base-100/40 hover:border-primary/30'
                      }`}
                      onClick={() =>
                        plan !== 'free' ? void handleCheckout(plan) : void router.push('/billing')
                      }
                      disabled={isBillingBusy || !session || currentPlan === plan}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium capitalize text-base-content">
                          {plan}
                        </span>
                        {currentPlan === plan && (
                          <span className="text-[0.6rem] uppercase tracking-wider text-primary">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-base-content/45">{desc}</span>
                    </button>
                  ))}
                  <Link href="/billing" className="btn btn-sm btn-ghost text-base-content/60 mt-1">
                    Manage billing
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </section>
      )}

      <footer className="mt-8 pb-4 text-center">
        <p className="text-xs text-base-content/30">
          Designed & built by <span className="text-primary/50">Deciwa</span>
        </p>
      </footer>
    </div>
  );
}
