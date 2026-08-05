import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, disabled, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const messageId = error ? `${selectId}-message` : undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={selectId} className="text-small font-medium">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={messageId}
          className={cn(
            "h-12 rounded-md border border-silver bg-white px-4 text-body outline-none transition-colors duration-fast hover:border-titanium focus-visible:border-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-fog-white disabled:text-silver",
            error && "border-danger",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span id={messageId} className="text-caption text-danger-ink">
            {error}
          </span>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
