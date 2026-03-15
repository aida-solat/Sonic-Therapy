import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg text-center">
        {/* 404 display */}
        <p className="font-display text-8xl text-primary/15 mb-4">404</p>

        <h1 className="font-display text-3xl md:text-4xl text-base-content">Page Not Found</h1>
        <p className="mt-4 text-base text-base-content/55 leading-relaxed max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
          <Link
            href="/dashboard"
            className="btn btn-outline btn-sm border-base-300/70 text-base-content/70"
          >
            Open Studio
          </Link>
        </div>

        <p className="mt-6 text-xs text-base-content/30">
          <span className="text-primary/50">Deciwa</span> &middot; Sonic Therapy
        </p>
      </div>
    </main>
  );
}
