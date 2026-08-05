import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, success, loading, disabled, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = error || success ? `${inputId}-message` : undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-small font-medium">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled || loading}
            aria-invalid={!!error}
            aria-describedby={messageId}
            className={cn(
              "h-12 w-full rounded-md border border-silver bg-white px-4 text-body outline-none transition-colors duration-fast placeholder:text-titanium hover:border-titanium focus-visible:border-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-fog-white disabled:text-silver",
              error && "border-danger",
              success && "border-success",
              loading && "pe-10",
              className,
            )}
            {...props}
          />
          {loading && <Spinner className="absolute end-4" />}
        </div>
        {error && (
          <span id={messageId} className="text-caption text-danger-ink">
            {error}
          </span>
        )}
        {!error && success && (
          <span id={messageId} className="text-caption text-success-ink">
            {success}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
