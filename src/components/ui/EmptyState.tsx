import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-100 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <span aria-hidden="true" className="size-12 rounded-md border border-silver" />
      <span className="text-h4 font-h4">{title}</span>
      {description && <p className="m-0 max-w-[280px] text-small leading-[1.6] text-gray-800">{description}</p>}
      {action}
    </div>
  );
}
