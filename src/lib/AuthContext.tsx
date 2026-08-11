import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from "@/lib/authStorage";
import type { AuthUser, ImpersonateConsumeResponse, OtpVerifyResponse } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  impersonationExpiresAt: string | null;
  login: (response: OtpVerifyResponse) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  /** Starts a restricted support-mode session from a redeemed impersonation
   * ticket — see ImpersonatePage. No refresh token: the session is only
   * ever as long as the access token's own lifetime. */
  beginImpersonation: (response: ImpersonateConsumeResponse) => void;
  /** Local-only cleanup — the caller is responsible for telling the backend
   * the session ended (POST /auth/impersonate/end/) before calling this,
   * since that call needs the still-stored token to authenticate. */
  endImpersonation: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredAuth()?.user ?? null);
  const [impersonationExpiresAt, setImpersonationExpiresAt] = useState<string | null>(
    () => loadStoredAuth()?.impersonationExpiresAt ?? null,
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isImpersonating: impersonationExpiresAt !== null,
      impersonationExpiresAt,
      login: (response) => {
        saveStoredAuth({ tokens: { access: response.access, refresh: response.refresh }, user: response.user });
        setUser(response.user);
        setImpersonationExpiresAt(null);
      },
      logout: () => {
        clearStoredAuth();
        setUser(null);
        setImpersonationExpiresAt(null);
      },
      updateUser: (nextUser) => {
        const stored = loadStoredAuth();
        if (stored) saveStoredAuth({ ...stored, user: nextUser });
        setUser(nextUser);
      },
      beginImpersonation: (response) => {
        const expiresAt = new Date(Date.now() + response.expiresInSeconds * 1000).toISOString();
        saveStoredAuth({ tokens: { access: response.access, refresh: "" }, user: response.user, impersonationExpiresAt: expiresAt });
        setUser(response.user);
        setImpersonationExpiresAt(expiresAt);
      },
      endImpersonation: () => {
        clearStoredAuth();
        setUser(null);
        setImpersonationExpiresAt(null);
      },
    }),
    [user, impersonationExpiresAt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
