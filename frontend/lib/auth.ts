/**
 * lib/auth.ts
 * -----------
 * Centralized, SSR-safe utilities for reading and clearing
 * user / admin session data from browser storage.
 *
 * Regular users:  tokens in HttpOnly cookies (set by API proxy)
 *                 display data in localStorage('user')
 *
 * Admin users:    tokens in HttpOnly cookies (admin_access_token / admin_refresh_token)
 *                 display data in sessionStorage('admin_user')
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface UserData {
  user_id?: number;
  full_name?: string;
  email?: string;
  organization_name?: string;
  role_in_org?: string;
  status?: string;
}

export interface AdminUserData {
  user_id?: number;
  full_name?: string;
  email?: string;
  role?: string;
}

// ─── Guard ───────────────────────────────────────────────────────────────────

const isBrowser = (): boolean => typeof window !== 'undefined';

// ─── Regular User Helpers ────────────────────────────────────────────────────

/**
 * Read regular user display data from localStorage.
 * Returns null on SSR or when not logged in.
 */
export function getUser(): UserData | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
}

/**
 * Clear regular user display data from localStorage.
 * (Actual auth cookies are cleared by the /api/auth/logout proxy.)
 */
export function clearUserSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem('user');
}

// ─── Admin User Helpers ──────────────────────────────────────────────────────

/**
 * Read admin display data from sessionStorage.
 * Returns null on SSR or when not logged in as admin.
 * Using sessionStorage means the session is cleared when the browser tab/window closes.
 */
export function getAdminUser(): AdminUserData | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem('admin_user');
    return raw ? (JSON.parse(raw) as AdminUserData) : null;
  } catch {
    return null;
  }
}

/**
 * Persist admin display data to sessionStorage after a successful admin login.
 */
export function setAdminUser(data: AdminUserData): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem('admin_user', JSON.stringify(data));
  } catch {
    // sessionStorage may be unavailable in private/incognito in some browsers
  }
}

/**
 * Clear admin display data from sessionStorage.
 * (Actual auth cookies are cleared by the /api/auth/admin/logout proxy.)
 */
export function clearAdminSession(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem('admin_user');
}
