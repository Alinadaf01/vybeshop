import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 once it scrolls into view — same
 * IntersectionObserver + prefers-reduced-motion pattern as useReveal, just
 * driving a number instead of opacity/translate (FIX-TASK.md §3: "شمارنده
 * اعداد درباره ما ... یک‌بار، سریع، بدون تکرار").
 */
export function useCountUp<T extends HTMLElement>(target: number, durationMs = 900) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(0);
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
