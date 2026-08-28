import { useEffect, useRef, useState } from "react";

// Unlike eNamad, Zarinpal doesn't offer a static hotlinkable <img> for their
// official gateway badge -- their own docs (zarinpal.com/docs/extensions/
// official-logo.html) only provide a JS widget that injects itself, same
// script for every merchant (no per-site id/code, unlike eNamad's URL).
// Zarinpal's own terms require displaying this on any site using their
// gateway, so this isn't cosmetic.
const ZARINPAL_TRUSTCODE_URL = "https://www.zarinpal.com/webservice/TrustCode";
// If their widget hasn't rendered anything by this point (script blocked,
// their service down, slow network), fall back to the admin-uploaded image
// rather than leave a permanently empty box -- same "official primary,
// uploaded fallback" idea as the trust badge, just via a different
// mechanism since there's no image URL to hotlink here.
const LOAD_TIMEOUT_MS = 4000;

export function ZarinpalTrustBadge({
  fallbackImage,
  fallbackLabel,
}: {
  fallbackImage: string | null;
  fallbackLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      // The script file can load successfully (no onerror) while its own
      // internal render still fails silently -- checking for the <img> it's
      // supposed to produce is the real success signal, not just "did the
      // script file download."
      if (!container.querySelector("img")) setFailed(true);
    }, LOAD_TIMEOUT_MS);

    const script = document.createElement("script");
    script.src = ZARINPAL_TRUSTCODE_URL;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setFailed(true);
    };
    container.appendChild(script);

    return () => {
      window.clearTimeout(timeout);
      // This div is intentionally outside React's own child management --
      // Zarinpal's script writes directly into it, so clearing it manually
      // on unmount is correct here rather than a "fighting the framework" bug.
      container.innerHTML = "";
    };
  }, []);

  if (failed) {
    return fallbackImage ? (
      <img src={fallbackImage} alt={fallbackLabel || "درگاه پرداخت"} className="h-full w-full object-contain" />
    ) : (
      <span>{fallbackLabel}</span>
    );
  }

  return <div ref={containerRef} className="grid h-full w-full place-items-center [&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain" />;
}
