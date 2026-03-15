'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useToast } from '@/components/toast';

type AuthMode = 'sign-in' | 'sign-up';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const isSupabaseConfigured = supabase !== null;

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      }
    });
  }, [supabase, router]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      toast(
        'error',
        'Supabase browser client is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
      return;
    }

    setBusy(true);

    try {
      if (authMode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.replace('/dashboard');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace('/dashboard');
        } else {
          toast('success', 'Account created. Check your email to confirm the session.');
        }
      }
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuthLogin(provider: 'google' | 'github') {
    if (!supabase) {
      toast('error', 'Supabase browser client is not configured.');
      return;
    }

    setBusy(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/dashboard',
        },
      });
      if (oauthError) throw oauthError;
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : `${provider} sign-in failed`);
      setBusy(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-lg">
        <div className="card ambient-surface bg-base-200/70">
          <div className="card-body gap-6 p-6 md:p-10">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
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
                  className="text-primary"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-base-content">Welcome to Sonic Therapy</h2>
              <p className="mt-1.5 text-sm text-base-content/50">
                Sign in to start your personalized therapy sessions
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <div className="rounded-xl border border-error/35 bg-error/10 p-4 text-sm leading-6 text-error-content/90">
                Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local.
              </div>
            ) : null}

            {/* OAuth providers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn btn-outline border-base-300/70 hover:border-primary/40 hover:bg-primary/5 gap-2.5"
                disabled={busy || !isSupabaseConfigured}
                onClick={() => void handleOAuthLogin('google')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="btn btn-outline border-base-300/70 hover:border-primary/40 hover:bg-primary/5 gap-2.5"
                disabled={busy || !isSupabaseConfigured}
                onClick={() => void handleOAuthLogin('github')}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-base-300/70" />
              <span className="text-xs text-base-content/35">or continue with email</span>
              <div className="h-px flex-1 bg-base-300/70" />
            </div>

            <div className="rounded-lg border border-base-300/70 bg-base-100/50 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    authMode === 'sign-in'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-200/50'
                  }`}
                  onClick={() => setAuthMode('sign-in')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    authMode === 'sign-up'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-200/50'
                  }`}
                  onClick={() => setAuthMode('sign-up')}
                >
                  Sign up
                </button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(event) => void handleAuthSubmit(event)}>
              <input
                type="email"
                className="input input-bordered w-full bg-base-100/80"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
              />
              <input
                type="password"
                className="input input-bordered w-full bg-base-100/80"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
              <button
                className="btn btn-primary w-full"
                type="submit"
                disabled={busy || !isSupabaseConfigured}
              >
                {busy ? 'Working...' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-xs text-base-content/30">
              By signing in, you agree to our terms of service
            </p>
          </div>
        </div>

        <footer className="mt-8 pb-4 text-center">
          <p className="text-xs text-base-content/30">
            Designed & built by <span className="text-primary/50">Deciwa</span>
          </p>
        </footer>
      </section>
    </main>
  );
}
