'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { api } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useToast } from '@/components/toast';
import type { AccountMeResponse, PlanType } from '@/lib/types';

/* ── Plan definitions ── */
const plans: {
  name: string;
  id: PlanType;
  price: string;
  priceNote: string;
  features: string[];
  highlight: boolean;
  quota: number;
}[] = [
  {
    name: 'Free',
    id: 'free',
    price: '$0',
    priceNote: 'forever',
    features: ['2 tracks / day', 'MP3 export only', 'Watermarked output', 'Community support'],
    highlight: false,
    quota: 2,
  },
  {
    name: 'Basic',
    id: 'basic',
    price: '$9',
    priceNote: '/ month',
    features: ['5 tracks / day', 'MP3 export', 'No watermark', 'Email support'],
    highlight: false,
    quota: 5,
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$29',
    priceNote: '/ month',
    features: [
      '20 tracks / day',
      'MP3 + WAV export',
      'No watermark',
      'Priority support',
      'Advanced moods & styles',
    ],
    highlight: true,
    quota: 20,
  },
  {
    name: 'Ultra',
    id: 'ultra',
    price: '$79',
    priceNote: '/ month',
    features: [
      '100 tracks / day',
      'MP3 + WAV export',
      'No watermark',
      'Commercial license',
      'Dedicated support',
      'Custom moods & styles',
    ],
    highlight: false,
    quota: 100,
  },
];

const creditPacks = [
  { amount: 10, price: '$5', perTrack: '$0.50', popular: false },
  { amount: 50, price: '$20', perTrack: '$0.40', popular: true },
  { amount: 200, price: '$60', perTrack: '$0.30', popular: false },
];

/* ── Icons ── */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/* ── Page ── */
export default function BillingPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [account, setAccount] = useState<AccountMeResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = account?.plan ?? 'free';
  const currentPlanDef = plans.find((p) => p.id === currentPlan) ?? plans[0];

  // Auth check
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

  // Redirect if not logged in
  useEffect(() => {
    if (sessionChecked && !session) {
      router.replace('/login');
    }
  }, [sessionChecked, session, router]);

  // Load account
  useEffect(() => {
    if (!session?.access_token) return;
    void (async () => {
      try {
        const data = await api.getAccountMe(baseUrl, session.access_token);
        setAccount(data);
      } catch (cause) {
        toast('error', cause instanceof Error ? cause.message : 'Failed to load account');
      }
    })();
  }, [session, baseUrl]);

  async function handleChangePlan(plan: PlanType) {
    if (!session?.access_token || plan === currentPlan) return;

    setBusy(`plan-${plan}`);

    try {
      if (plan === 'free') {
        // Downgrade to free = cancel via portal
        await handlePortal();
        return;
      }

      const { url } = await api.createCheckoutSession(baseUrl, session.access_token, {
        plan: plan as 'basic' | 'pro' | 'ultra',
        successUrl: window.location.origin + '/billing?success=true',
        cancelUrl: window.location.origin + '/billing',
      });
      window.location.href = url;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to start checkout');
    } finally {
      setBusy(null);
    }
  }

  async function handlePortal() {
    if (!session?.access_token) return;

    setBusy('portal');

    try {
      const { url } = await api.createPortalSession(baseUrl, session.access_token, {
        returnUrl: window.location.origin + '/billing',
      });
      window.location.href = url;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to open billing portal');
    } finally {
      setBusy(null);
    }
  }

  async function handleCancelPlan() {
    if (!session?.access_token) return;

    setBusy('cancel');
    setShowCancelConfirm(false);

    try {
      // Cancel goes through Stripe portal
      const { url } = await api.createPortalSession(baseUrl, session.access_token, {
        returnUrl: window.location.origin + '/billing',
      });
      window.location.href = url;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to open cancellation portal');
    } finally {
      setBusy(null);
    }
  }

  async function handleBuyCredits(amount: number) {
    if (!session?.access_token) return;

    setBusy(`credits-${amount}`);

    try {
      const { url } = await api.createCheckoutSession(baseUrl, session.access_token, {
        plan: 'basic' as const, // credits use checkout flow
        successUrl: window.location.origin + '/billing?credits=true',
        cancelUrl: window.location.origin + '/billing',
      });
      window.location.href = url;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Failed to start credit purchase');
    } finally {
      setBusy(null);
    }
  }

  // Check for success return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast('success', 'Plan updated successfully! Changes may take a moment to reflect.');
      window.history.replaceState({}, '', '/billing');
    }
    if (params.get('credits') === 'true') {
      toast('success', 'Credits purchased successfully!');
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  if (!sessionChecked || (!session && sessionChecked)) {
    return null;
  }

  // Full-page loading: wait for account data before rendering anything
  if (account === null) {
    return (
      <main className="app-shell space-y-6 md:space-y-8">
        <div className="px-5 md:px-6 space-y-8 pb-8">
          {/* Header skeleton */}
          <header className="pt-2">
            <div className="flex items-center gap-4">
              <div className="skeleton h-8 w-8 rounded-lg bg-base-300/70" />
              <div className="space-y-2">
                <div className="skeleton h-3 w-14 bg-base-300/60" />
                <div className="skeleton h-8 w-40 bg-base-300/70" />
              </div>
            </div>
          </header>

          {/* Current Plan & Usage skeleton */}
          <section className="grid gap-5 md:grid-cols-2">
            <div className="card ambient-surface bg-base-200/70">
              <div className="card-body gap-4 p-5 md:p-6">
                <div className="skeleton h-4 w-24 bg-base-300/70" />
                <div className="flex items-baseline gap-2">
                  <div className="skeleton h-10 w-20 bg-base-300/70" />
                  <div className="skeleton h-4 w-16 bg-base-300/60" />
                </div>
                <div className="space-y-2 mt-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="skeleton h-3.5 w-3.5 rounded-full bg-base-300/60" />
                      <div className="skeleton h-3 w-32 bg-base-300/60" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card ambient-surface bg-base-200/70">
              <div className="card-body gap-4 p-5 md:p-6">
                <div className="skeleton h-4 w-28 bg-base-300/70" />
                <div className="flex items-baseline gap-2">
                  <div className="skeleton h-10 w-12 bg-base-300/70" />
                  <div className="skeleton h-4 w-24 bg-base-300/60" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-2.5 w-full rounded-full bg-base-300/60" />
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-base-100/50 px-3 py-2 space-y-1.5 flex flex-col items-center"
                      >
                        <div className="skeleton h-5 w-8 bg-base-300/70" />
                        <div className="skeleton h-2 w-12 bg-base-300/60" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Plan cards skeleton */}
          <section>
            <div className="mb-5 space-y-2">
              <div className="skeleton h-6 w-32 bg-base-300/70" />
              <div className="skeleton h-4 w-64 bg-base-300/60" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card border border-base-300/70 bg-base-200/50">
                  <div className="card-body gap-4 p-5">
                    <div className="skeleton h-5 w-16 bg-base-300/70" />
                    <div className="flex items-baseline gap-1">
                      <div className="skeleton h-8 w-14 bg-base-300/70" />
                      <div className="skeleton h-3 w-16 bg-base-300/60" />
                    </div>
                    <div className="space-y-1.5">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="skeleton h-3.5 w-3.5 rounded-full bg-base-300/60" />
                          <div className="skeleton h-3 w-28 bg-base-300/60" />
                        </div>
                      ))}
                    </div>
                    <div className="skeleton h-8 w-full rounded-lg bg-base-300/70 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="pt-4 pb-2 text-center">
            <p className="text-xs text-base-content/30">
              Designed & built by <span className="text-primary/50">Deciwa</span>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  const usagePercent =
    account && account.dailyQuota > 0
      ? Math.round((account.usedToday / account.dailyQuota) * 100)
      : 0;

  return (
    <main className="app-shell space-y-6 md:space-y-8">
      <div className="px-5 md:px-6 space-y-8 pb-8">
        {/* ── Header ── */}
        <header className="pt-2">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-base-content"
            >
              <ArrowLeftIcon />
            </Link>
            <div>
              <p className="editorial-kicker">Studio</p>
              <h1 className="editorial-title text-[1.8rem] md:text-[2.1rem]">Billing & Plans</h1>
            </div>
          </div>
        </header>

        {/* ── Current Plan & Usage ── */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* Current plan card */}
          <div className="card ambient-surface bg-base-200/70">
            <div className="card-body gap-4 p-5 md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-base-content/70">Current Plan</h2>
                {currentPlan !== 'free' && (
                  <span className="badge badge-primary badge-sm">Active</span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl text-primary capitalize">{currentPlan}</span>
                <span className="text-sm text-base-content/40">
                  {currentPlanDef.price} {currentPlanDef.priceNote}
                </span>
              </div>

              <ul className="space-y-1.5 mt-1">
                {currentPlanDef.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-base-content/60">
                    <CheckIcon className="h-3.5 w-3.5 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan !== 'free' && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm border-base-300/70 text-base-content/60 gap-1.5"
                    onClick={() => void handlePortal()}
                    disabled={busy === 'portal'}
                  >
                    <CreditCardIcon className="h-3.5 w-3.5" />
                    {busy === 'portal' ? 'Opening...' : 'Manage Payment'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error/60 hover:text-error"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Plan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usage card */}
          <div className="card ambient-surface bg-base-200/70">
            <div className="card-body gap-4 p-5 md:p-6">
              <h2 className="text-sm font-medium text-base-content/70">Today&apos;s Usage</h2>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl text-base-content">{account.usedToday}</span>
                <span className="text-sm text-base-content/40">
                  / {account.dailyQuota} tracks used
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="flex justify-between text-xs text-base-content/40 mb-1.5">
                  <span>{account.remainingToday} remaining</span>
                  <span>{usagePercent}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-base-300/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 90
                        ? 'bg-error'
                        : usagePercent >= 70
                          ? 'bg-warning'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                  <p className="font-display text-lg text-primary">{account.dailyQuota}</p>
                  <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                    Daily Quota
                  </p>
                </div>
                <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                  <p className="font-display text-lg text-secondary">{account.usedToday}</p>
                  <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                    Used
                  </p>
                </div>
                <div className="rounded-lg bg-base-100/50 px-3 py-2 text-center">
                  <p className="font-display text-lg text-accent">{account.remainingToday}</p>
                  <p className="text-[0.6rem] uppercase tracking-wider text-base-content/40">
                    Left
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Cancel Confirmation Modal ── */}
        {showCancelConfirm && (
          <div className="card ambient-surface bg-base-200/70 border-error/20">
            <div className="card-body gap-4 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-error"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg text-base-content">Cancel your plan?</h3>
                  <p className="mt-1 text-sm text-base-content/55 leading-relaxed">
                    You&apos;ll be downgraded to the Free plan at the end of your current billing
                    period. You&apos;ll keep access to your current plan features until then.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Plan
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={() => void handleCancelPlan()}
                  disabled={busy === 'cancel'}
                >
                  {busy === 'cancel' ? 'Opening...' : 'Yes, Cancel Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Plan ── */}
        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl text-base-content">Change Plan</h2>
            <p className="mt-1 text-sm text-base-content/50">
              Upgrade or downgrade anytime. Changes take effect immediately.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isUpgrade =
                plans.findIndex((p) => p.id === plan.id) >
                plans.findIndex((p) => p.id === currentPlan);

              return (
                <div
                  key={plan.id}
                  className={`card transition-all ${
                    plan.highlight && !isCurrent
                      ? 'border-2 border-primary/40 bg-base-200/70'
                      : isCurrent
                        ? 'border-2 border-success/40 bg-success/5'
                        : 'border border-base-300/70 bg-base-200/50'
                  }`}
                >
                  <div className="card-body gap-4 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg text-base-content">{plan.name}</h3>
                      {isCurrent && (
                        <span className="badge badge-success badge-sm gap-1">
                          <CheckIcon className="h-3 w-3" />
                          Current
                        </span>
                      )}
                      {plan.highlight && !isCurrent && (
                        <span className="badge badge-primary badge-sm">Popular</span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl text-base-content">{plan.price}</span>
                      <span className="text-sm text-base-content/40">{plan.priceNote}</span>
                    </div>

                    <p className="text-xs text-base-content/40">{plan.quota} tracks / day</p>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-base-content/60"
                        >
                          <CheckIcon className="h-3.5 w-3.5 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`btn btn-sm w-full mt-2 ${
                        isCurrent
                          ? 'btn-disabled bg-success/10 text-success border-success/20'
                          : plan.highlight
                            ? 'btn-primary'
                            : 'btn-outline border-base-300/70'
                      }`}
                      disabled={isCurrent || busy !== null}
                      onClick={() => void handleChangePlan(plan.id)}
                    >
                      {busy === `plan-${plan.id}`
                        ? 'Redirecting...'
                        : isCurrent
                          ? 'Current Plan'
                          : isUpgrade
                            ? 'Upgrade'
                            : 'Downgrade'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── API Credits ── */}
        <section>
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <ZapIcon className="h-5 w-5 text-info" />
              <h2 className="font-display text-xl text-base-content">API Credits</h2>
            </div>
            <p className="mt-1 text-sm text-base-content/50">
              Need more tracks? Purchase credit packs for additional API calls beyond your daily
              quota.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {creditPacks.map((pack) => (
              <div
                key={pack.amount}
                className={`card transition-all ${
                  pack.popular
                    ? 'border-2 border-info/40 bg-info/5'
                    : 'border border-base-300/70 bg-base-200/50'
                }`}
              >
                <div className="card-body gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-base-content">
                      {pack.amount} Credits
                    </h3>
                    {pack.popular && <span className="badge badge-info badge-sm">Best Value</span>}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl text-base-content">{pack.price}</span>
                    <span className="text-sm text-base-content/40">one-time</span>
                  </div>

                  <p className="text-xs text-base-content/40">
                    {pack.perTrack} per track &middot; Never expires
                  </p>

                  <button
                    type="button"
                    className={`btn btn-sm w-full mt-1 ${
                      pack.popular ? 'btn-info' : 'btn-outline border-base-300/70'
                    }`}
                    disabled={busy !== null}
                    onClick={() => void handleBuyCredits(pack.amount)}
                  >
                    {busy === `credits-${pack.amount}` ? 'Redirecting...' : 'Purchase'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Billing FAQ ── */}
        <section>
          <h2 className="font-display text-xl text-base-content mb-4">Billing FAQ</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                q: 'When does my plan renew?',
                a: 'Plans renew monthly on the same date you subscribed. Your daily quota resets at midnight UTC.',
              },
              {
                q: 'Can I change plans mid-cycle?',
                a: 'Yes. Upgrades take effect immediately with prorated billing. Downgrades apply at the end of the current period.',
              },
              {
                q: 'What happens when I cancel?',
                a: "You keep access to your current plan until the billing period ends, then you're moved to the Free plan.",
              },
              {
                q: 'Do API credits expire?',
                a: 'No. Purchased credits never expire and can be used anytime, even on the Free plan.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-base-300/70 bg-base-200/40 px-5 py-4"
              >
                <h3 className="text-sm font-medium text-base-content">{item.q}</h3>
                <p className="mt-1.5 text-sm text-base-content/50 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-4 pb-2 text-center">
          <p className="text-xs text-base-content/30">
            Designed & built by <span className="text-primary/50">Deciwa</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
