import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Maintenance mode middleware.
 *
 * Set NEXT_PUBLIC_MAINTENANCE_MODE=true in web/.env.local to redirect
 * all traffic (except the maintenance page itself and static assets)
 * to /maintenance.
 */
export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  if (!isMaintenanceMode) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Allow the home page, maintenance page, static assets, and Next.js internals through
  if (
    pathname === '/' ||
    pathname === '/maintenance' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const maintenanceUrl = new URL('/maintenance', request.url);
  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
