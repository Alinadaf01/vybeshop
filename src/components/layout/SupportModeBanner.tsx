import { useCallback, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { endImpersonationSession } from "@/lib/api";

/** Always-visible while a support-mode session is active — §"سه محافظ"،
 * محافظ ۱. Without this, a support agent can lose track of which account
 * they're looking at and mistake it for their own. */
export function SupportModeBanner() {
  const { user, isImpersonating, impersonationExpiresAt, endImpersonation } = useAuth();

  const exitSupportMode = useCallback(() => {
    endImpersonationSession()
      .catch(() => {
        // best-effort — the session dies on its own at the token's natural
        // expiry even if this call fails, so still clear it locally.
      })
      .finally(() => {
        endImpersonation();
        window.location.href = "/";
      });
  }, [endImpersonation]);

  // §"محافظ ۳" — the session also enforces its own 30-minute ceiling
  // client-side, on top of the access token simply expiring server-side.
  useEffect(() => {
    if (!isImpersonating || !impersonationExpiresAt) return;
    const remainingMs = new Date(impersonationExpiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      exitSupportMode();
      return;
    }
    const timer = window.setTimeout(exitSupportMode, remainingMs);
    return () => window.clearTimeout(timer);
  }, [isImpersonating, impersonationExpiresAt, exitSupportMode]);

  if (!isImpersonating) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[200] flex flex-wrap items-center justify-center gap-3 bg-warning px-4 py-2 text-center text-small font-bold text-warning-ink"
    >
      <span>
        حالت پشتیبانی — شما در حال مشاهده حساب {user?.firstName || user?.phone} هستید
      </span>
      <button
        type="button"
        onClick={exitSupportMode}
        className="rounded-md bg-warning-ink/10 px-3 py-1 text-small font-bold text-warning-ink transition-colors hover:bg-warning-ink/20"
      >
        خروج
      </button>
    </div>
  );
}
