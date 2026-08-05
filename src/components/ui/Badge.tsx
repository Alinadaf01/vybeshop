import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badge = cva("inline-flex items-center", {
  variants: {
    variant: {
      solid: "rounded-sm bg-graphite px-2 py-1 font-mono text-micro tracking-[0.06em] text-fog-white",
      subtle: "rounded-sm bg-gray-100 px-2 py-1 font-mono text-micro tracking-[0.06em] text-gray-800",
      success: "rounded-full border border-success-ink px-2.5 py-1 text-caption text-success-ink",
      neutral: "rounded-full border border-titanium px-2.5 py-1 text-caption text-gray-800",
      danger: "rounded-full border border-danger px-2.5 py-1 text-caption text-danger-ink",
    },
  },
  defaultVariants: {
    variant: "subtle",
  },
});

export interface BadgeProps extends VariantProps<typeof badge> {
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)}>{children}</span>;
}
