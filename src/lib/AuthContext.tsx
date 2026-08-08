import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from "@/lib/authStorage";
import type { AuthUser, OtpVerifyResponse } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (response: OtpVerifyResponse) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredAuth()?.user ?? null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: (response) => {
        saveStoredAuth({ tokens: { access: response.access, refresh: response.refresh }, user: response.user });
        setUser(response.user);
      },
      logout: () => {
        clearStoredAuth();
        setUser(null);
      },
      updateUser: (nextUser) => {
        const stored = loadStoredAuth();
        if (stored) saveStoredAuth({ ...stored, user: nextUser });
        setUser(nextUser);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
