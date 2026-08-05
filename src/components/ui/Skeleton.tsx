import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-shimmer rounded-sm bg-[length:200%_100%]", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--color-gray-100) 25%, var(--color-fog-white) 50%, var(--color-gray-100) 75%)",
      }}
    />
  );
}
