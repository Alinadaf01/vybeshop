import type { ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";
import { cn } from "@/lib/cn";

export function Reveal({
  children,
  className,
  delayMs,
}: {
  children: ReactNode;
  className?: string;
  /** ورود پلکانی در گریدها (FIX-TASK.md §3) — معمولاً `index * 70`. */
  delayMs?: number;
}) {
  const { ref, className: revealClassName } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn("transition-all duration-slow", revealClassName, className)}
    >
      {children}
    </div>
  );
}
