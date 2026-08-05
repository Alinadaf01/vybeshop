import { cn } from "@/lib/cn";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="در حال بارگذاری"
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-2 border-gray-100 border-t-graphite",
        className,
      )}
    />
  );
}
