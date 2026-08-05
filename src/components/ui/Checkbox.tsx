import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, disabled, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <label
        htmlFor={inputId}
        aria-disabled={disabled || undefined}
        className={cn(
          "inline-flex select-none items-center gap-2",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span className="relative inline-flex size-5 shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            className={cn("peer absolute inset-0 z-10 size-5 cursor-pointer opacity-0", className)}
            {...props}
          />
          <span
            className={cn(
              "pointer-events-none absolute inset-0 rounded-sm border border-silver bg-white transition-colors duration-fast peer-checked:border-graphite peer-checked:bg-graphite peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan peer-disabled:border-gray-100 peer-disabled:bg-fog-white",
              error && "border-danger",
            )}
          />
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="pointer-events-none absolute inset-0 size-5 p-1 opacity-0 peer-checked:opacity-100"
          >
            <path
              d="M2 6.2 4.8 9 10 3"
              stroke="var(--color-fog-white)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={cn("text-body", disabled && "text-silver", error && "text-danger-ink")}>
          {label}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
