import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected and public routes
const publicRoutes = ['/login', '/signup-master', '/signup-user', '/admin-login'];
const publicApiRoutes = ['/api/auth/login', '/api/auth/register-user'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internal routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/) ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const isPublicRoute = publicRoutes.includes(pathname);
  
  console.log(`[Middleware] Path: ${pathname}, Token exists: ${!!token}, IsPublic: ${isPublicRoute}`);

  // 1. Redirect unauthenticated users from protected routes to login
  if (!token && !isPublicRoute) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to /login`);
    const loginUrl = new URL('/login', request.url);
    // You could also save the callback URL to redirect them back later
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect authenticated users away from public routes (like login)
  // Also redirect the root '/' to '/home' if they are authenticated.
  if (token && (isPublicRoute || pathname === '/')) {
    // If they have a token and try to go to /login or /, redirect to /home
    // (In a real app, you might decode the JWT to check their role to determine /home vs /admin-home)
    const homeUrl = new URL('/home', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/home',
    '/new-tender',
    '/admin-home',
    '/view-my-tender',
    '/bid-for-tender'
  ],
};
