import { NextRequest, NextResponse } from 'next/server';

/**
 * ProcureNext — Authentication Proxy (Next.js 16)
 * -------------------------------------------------
 * Runs before any page renders (Next.js 16 renamed middleware → proxy).
 * Enforces route-level access control based on HttpOnly auth cookies.
 *
 * Cookie signals:
 *   access_token       — present when a regular user is logged in
 *   admin_access_token — present when an admin is logged in
 *
 * Route categories:
 *   PUBLIC          — accessible by everyone (landing, login, signup pages)
 *   USER_PROTECTED  — requires access_token; redirect to /login if missing
 *   ADMIN_PROTECTED — requires admin_access_token; redirect to /admin-login if missing
 *   GUEST_ONLY      — accessible only when NOT logged in (login/signup pages);
 *                     redirect logged-in users away so they don't see login again
 */

// ─── Route Definitions ────────────────────────────────────────────────────────

/** Pages a regular logged-in user must not see (redirect to /home). */
const USER_GUEST_ONLY_ROUTES = ['/login', '/signup-master'];

/** Pages an admin must not see when already logged in (redirect to /admin-home). */
const ADMIN_GUEST_ONLY_ROUTES = ['/admin-login'];

/** Pages that require a regular user session. */
const USER_PROTECTED_ROUTES = [
  '/home',
  '/new-tender',
  '/edit-tender',
  '/bid-for-tender',
  '/view-my-bids',
  '/view-my-tender',
  '/ongoing-tenders',
  '/organizations',
];

/** Pages that require an admin session. */
const ADMIN_PROTECTED_ROUTES = ['/admin-home'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasUserToken(request: NextRequest): boolean {
  return !!request.cookies.get('access_token')?.value;
}

function hasAdminToken(request: NextRequest): boolean {
  return !!request.cookies.get('admin_access_token')?.value;
}

function redirectTo(destination: string, request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(destination, request.url));
}

// ─── Proxy (Next.js 16 renamed middleware → proxy) ─────────────────────────

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isUserLoggedIn = hasUserToken(request);
  const isAdminLoggedIn = hasAdminToken(request);

  // ── Admin-protected routes ──────────────────────────────────────────────────────────
  if (ADMIN_PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAdminLoggedIn) {
      return redirectTo('/admin-login', request);
    }
    return NextResponse.next();
  }

  // ── User-protected routes ─────────────────────────────────────────────────────────────
  if (USER_PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isUserLoggedIn) {
      return redirectTo('/login', request);
    }
    return NextResponse.next();
  }

  // ── Admin guest-only routes ──────────────────────────────────────────────────────────
  // If already logged in as admin, skip the admin-login page
  if (ADMIN_GUEST_ONLY_ROUTES.includes(pathname)) {
    if (isAdminLoggedIn) {
      return redirectTo('/admin-home', request);
    }
    return NextResponse.next();
  }

  // ── User guest-only routes ─────────────────────────────────────────────────────────────
  // If already logged in as a regular user, skip login/signup pages
  if (USER_GUEST_ONLY_ROUTES.includes(pathname)) {
    if (isUserLoggedIn) {
      return redirectTo('/home', request);
    }
    return NextResponse.next();
  }

  // ── Everything else (public routes: `/`, `/api/*`, static assets) ──────────
  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimization)
     *   - favicon.ico   (browser favicon)
     *   - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js)$).*)',
  ],
};
