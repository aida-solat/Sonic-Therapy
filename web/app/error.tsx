'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg text-center">
        {/* Error icon */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-error/15 border border-error/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-error"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-base-content">
          Something Went Wrong
        </h1>
        <p className="mt-4 text-base text-base-content/55 leading-relaxed max-w-md mx-auto">
          An unexpected error occurred. Our team has been notified and is working on a fix.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-base-content/30">
            Error reference: <code className="text-base-content/40">{error.digest}</code>
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn btn-primary btn-sm gap-2">
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
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>
          <a href="/" className="btn btn-outline btn-sm border-base-300/70 text-base-content/70">
            Back to Home
          </a>
        </div>

        <p className="mt-6 text-xs text-base-content/30">
          If this keeps happening, contact <span className="text-primary/60">Deciwa</span>
        </p>
      </div>
    </main>
  );
}
