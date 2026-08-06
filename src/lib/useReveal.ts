import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal via IntersectionObserver + CSS only (no animation library).
 * Skips the animation entirely for prefers-reduced-motion, per tokens.json's
 * motion note and the F5 requirement.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    className: visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
  };
}
