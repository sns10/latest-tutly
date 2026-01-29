/**
 * Runs before the backend client is imported.
 *
 * Why this exists:
 * Some devices can get stuck with a stale auth token in localStorage, which
 * triggers "Invalid Refresh Token: Refresh Token Not Found" during client init.
 * Clearing the stored token on the /auth route prevents repeated refresh attempts.
 */

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const authStorageKey = projectId ? `sb-${projectId}-auth-token` : null;

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function bootstrapAuthStorage() {
  if (typeof window === 'undefined') return;
  if (!authStorageKey) return;

  // If the user is on the login page, any persisted session is stale for this visit.
  // Clearing it prevents refresh-token error spam + crash loops.
  if (window.location.pathname === '/auth') {
    safeRemove(authStorageKey);
    return;
  }

  // Also clear malformed tokens so the app can recover cleanly.
  try {
    const raw = localStorage.getItem(authStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const hasTokens = Boolean(parsed?.access_token) && Boolean(parsed?.refresh_token);
    if (!hasTokens) safeRemove(authStorageKey);
  } catch {
    safeRemove(authStorageKey);
  }
}

bootstrapAuthStorage();
