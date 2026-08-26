import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 once it scrolls into view — same
 * IntersectionObserver + prefers-reduced-motion pattern as useReveal, just
 * driving a number instead of opacity/translate (FIX-TASK.md §3: "شمارنده
 * اعداد درباره ما ... یک‌بار، سریع، بدون تکرار").
 */
export function useCountUp<T extends HTMLElement>(target: number, durationMs = 900) {
  const ref = useRef<T>(null);
  // Starts at `target`, not 0 -- this is what the prerendered/initial HTML
  // ships (FIX-TASK.md: bots and no-JS visitors must see the real number,
  // e.g. 1405, not 0). The count-up is a progressive-enhancement animation
  // that resets to 0 and plays only once actually triggered below, not
  // something the initial render depends on.
  const [value, setValue] = useState(target);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggeredRef.current) return;
        triggeredRef.current = true;
        observer.disconnect();

        setValue(0);
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / durationMs, 1);
          setValue(Math.round(target * progress));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}
