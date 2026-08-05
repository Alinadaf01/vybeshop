import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "h-12 rounded-md border border-transparent bg-graphite px-6 text-body text-fog-white hover:bg-ink disabled:bg-silver disabled:text-fog-white",
        secondary:
          "h-12 rounded-md border border-titanium bg-white px-6 text-body text-graphite hover:border-graphite disabled:border-gray-100 disabled:text-silver",
        text: "h-10 rounded-none border-0 border-b border-silver bg-transparent p-0 text-body text-graphite hover:border-cyan disabled:border-gray-100 disabled:text-silver",
      },
      error: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "primary", error: true, className: "border-danger" },
      { variant: "secondary", error: true, className: "border-danger text-danger-ink" },
      { variant: "text", error: true, className: "border-danger text-danger-ink" },
    ],
    defaultVariants: {
      variant: "primary",
      error: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, error, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(button({ variant, error }), loading && "cursor-progress", className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Spinner
            className={variant === "primary" ? "border-gray-800 border-t-fog-white" : undefined}
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
