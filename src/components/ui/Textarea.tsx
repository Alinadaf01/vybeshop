import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, success, disabled, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const messageId = error || success ? `${textareaId}-message` : undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={textareaId} className="text-small font-medium">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={messageId}
          className={cn(
            "resize-y rounded-md border border-silver bg-white px-4 py-3 text-body outline-none transition-colors duration-fast placeholder:text-titanium hover:border-titanium focus-visible:border-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-fog-white disabled:text-silver",
            error && "border-danger",
            success && "border-success",
            className,
          )}
          {...props}
        />
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
Textarea.displayName = "Textarea";
