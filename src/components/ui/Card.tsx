import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-lg border border-gray-100 bg-white",
          interactive && "transition-colors duration-base hover:border-titanium",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";
