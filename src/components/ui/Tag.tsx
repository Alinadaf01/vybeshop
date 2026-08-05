import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TagProps {
  children: ReactNode;
  selected?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Tag({ children, selected, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-full border px-2.5 py-1 text-caption",
        selected ? "border-graphite bg-graphite text-fog-white" : "border-gray-100 text-graphite",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف فیلتر"
          className={cn(
            "leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
            selected ? "text-silver hover:text-white" : "text-gray-800 hover:text-graphite",
          )}
        >
          &#10005;
        </button>
      )}
    </span>
  );
}
