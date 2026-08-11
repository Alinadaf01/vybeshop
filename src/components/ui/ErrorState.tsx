import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
  title: string;
  description?: string;
  errorCode?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({ title, description, errorCode, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-100 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <AlertCircle aria-hidden="true" size={48} strokeWidth={1.5} className="text-danger-ink" />
      <span className="text-h4 font-h4">{title}</span>
      {description && <p className="m-0 max-w-[280px] text-small leading-[1.6] text-gray-800">{description}</p>}
      {action}
      {errorCode && (
        <span dir="ltr" className="font-mono text-micro text-gray-800">
          {errorCode}
        </span>
      )}
    </div>
  );
}
