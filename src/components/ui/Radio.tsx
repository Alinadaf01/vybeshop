import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
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
        <span className="relative inline-flex size-5 shrink-0">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            disabled={disabled}
            className={cn("peer absolute inset-0 z-10 size-5 cursor-pointer opacity-0", className)}
            {...props}
          />
          <span className="pointer-events-none absolute inset-0 rounded-full border border-silver bg-white transition-colors duration-fast peer-checked:border-graphite peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan peer-disabled:border-gray-100 peer-disabled:bg-fog-white" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 peer-checked:opacity-100">
            <span className="size-2.5 rounded-full bg-graphite" />
          </span>
        </span>
        <span className={cn("text-body", disabled && "text-silver")}>{label}</span>
      </label>
    );
  },
);
Radio.displayName = "Radio";
