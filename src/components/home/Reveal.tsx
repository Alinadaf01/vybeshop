import type { ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";
import { cn } from "@/lib/cn";

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, className: revealClassName } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("transition-all duration-slow", revealClassName, className)}>
      {children}
    </div>
  );
}
