import type { AuthTokens, AuthUser } from "@/types/auth";

const STORAGE_KEY = "vybe-auth";

export interface StoredAuth {
  tokens: AuthTokens;
  user: AuthUser;
  /** Present only for a support-mode (impersonated) session — tokens.refresh
   * is "" in that case, since there's nothing to renew with; this is just
   * the ISO timestamp the client-side session timer counts down to. */
  impersonationExpiresAt?: string | null;
}

// localStorage doesn't exist in Node — AuthProvider's initial state reads
// loadStoredAuth() synchronously during render, and it now also renders
// during the build-time prerender pass (see PrerenderLayout), so this can't
// assume a browser anymore.
const hasLocalStorage = typeof localStorage !== "undefined";

export function loadStoredAuth(): StoredAuth | null {
  if (!hasLocalStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth): void {
  if (!hasLocalStorage) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  if (!hasLocalStorage) return;
  localStorage.removeItem(STORAGE_KEY);
}
