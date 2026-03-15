import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg text-center">
        {/* Animated pulse ring */}
        <div className="mx-auto mb-8 relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-warning/10 animate-ping" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 border border-warning/30">
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
              className="text-warning"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-base-content">Under Maintenance</h1>
        <p className="mt-4 text-base text-base-content/55 leading-relaxed max-w-md mx-auto">
          We&apos;re performing scheduled maintenance to improve your experience. The studio will be
          back shortly.
        </p>

        {/* Status indicators */}
        <div className="mt-8 inline-flex flex-col gap-3 rounded-2xl border border-base-300/70 bg-base-200/50 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning animate-pulse" />
            <span className="text-sm text-base-content/60">API services temporarily offline</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning animate-pulse" />
            <span className="text-sm text-base-content/60">Track generation paused</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-sm text-base-content/60">Your data is safe and preserved</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/" className="btn btn-primary btn-sm gap-2">
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
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Home
          </Link>
          <p className="text-xs mt-8 text-base-content/30">
            Questions? Contact <span className="text-primary/60">Deciwa</span>
          </p>
        </div>
      </div>
    </main>
  );
}
