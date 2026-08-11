import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { consumeImpersonationTicket } from "@/lib/api";

/** The only place the ticket from the admin panel's impersonate link ever
 * lands — it's redeemed here, server-side, via a POST body. The real
 * session token this returns never touches a URL. */
export default function ImpersonatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { beginImpersonation } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // The ticket is single-use — React 18 StrictMode's dev-only double-invoke
  // of effects would otherwise burn it on the first call and always show an
  // error on the (harmless but confusing) second one.
  const consumedRef = useRef(false);

  useEffect(() => {
    const ticket = searchParams.get("ticket");
    if (!ticket) {
      setError("بلیط نامعتبر است.");
      return;
    }
    if (consumedRef.current) return;
    consumedRef.current = true;

    let cancelled = false;
    consumeImpersonationTicket(ticket)
      .then((response) => {
        if (cancelled) return;
        beginImpersonation(response);
        navigate("/account", { replace: true });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "بلیط نامعتبر یا منقضی‌شده است.");
      });
    return () => {
      cancelled = true;
    };
    // Ticket redemption is single-use and meant to run exactly once per
    // mount — re-running on every searchParams identity change would burn
    // the ticket a second time and always fail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="m-0 text-body text-graphite">
        {error ?? "در حال ورود به نشست پشتیبانی…"}
      </p>
    </div>
  );
}
