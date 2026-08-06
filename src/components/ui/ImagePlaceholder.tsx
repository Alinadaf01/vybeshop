import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export interface ImagePlaceholderProps {
  caption: string;
  dark?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ImagePlaceholder({ caption, dark, className, style }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={caption}
      style={style}
      className={cn(
        "flex items-end p-4",
        dark
          ? "bg-[repeating-linear-gradient(135deg,#141416_0_10px,#0B0B0C_10px_20px)]"
          : "bg-[repeating-linear-gradient(135deg,#ECECEC_0_10px,#F5F5F3_10px_20px)]",
        className,
      )}
    >
      <span dir="ltr" aria-hidden="true" className={cn("font-mono text-micro leading-[1.6]", dark ? "text-silver" : "text-gray-800")}>
        {caption}
      </span>
    </div>
  );
}
