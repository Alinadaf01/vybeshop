import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, disabled, id, ...props }, ref) => {
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
        <span className="relative inline-flex h-6 w-11 shrink-0">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={inputId}
            disabled={disabled}
            className={cn("peer absolute inset-0 z-10 h-6 w-11 cursor-pointer opacity-0", className)}
            {...props}
          />
          <span className="pointer-events-none flex h-6 w-11 items-center rounded-full bg-silver p-0.5 transition-colors duration-fast peer-checked:justify-end peer-checked:bg-graphite peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan peer-disabled:bg-gray-100">
            <span className="size-5 rounded-full bg-white" />
          </span>
        </span>
        <span className={cn("text-body", disabled && "text-silver")}>{label}</span>
      </label>
    );
  },
);
Switch.displayName = "Switch";
