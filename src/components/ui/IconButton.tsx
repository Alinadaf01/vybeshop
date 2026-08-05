import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const iconButton = cva(
  "inline-flex shrink-0 items-center justify-center transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "size-9 rounded-md",
        md: "size-11 rounded-md",
      },
      variant: {
        outline: "border border-edge bg-transparent text-silver hover:text-fog-white",
        ghost: "border-0 bg-transparent p-0 text-gray-800 hover:text-graphite",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "outline",
    },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButton> {
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, variant, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(iconButton({ size, variant }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
