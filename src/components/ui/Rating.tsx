import { cn } from "@/lib/cn";

export interface RatingProps {
  value: number;
  count?: number;
  className?: string;
}

export function Rating({ value, count, className }: RatingProps) {
  const rounded = Math.round(value);

  return (
    <span
      role="img"
      aria-label={`امتیاز ${value.toLocaleString("en-US")} از ۵${count != null ? ` بر اساس ${count} نظر` : ""}`}
      className={cn("flex items-center gap-2", className)}
    >
      <span aria-hidden="true" className="text-body tracking-[2px]">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rounded ? "text-graphite" : "text-silver"}>
            &#9733;
          </span>
        ))}
      </span>
      <span dir="ltr" className="font-mono text-caption text-gray-800">
        {value.toLocaleString("en-US")}
        {count != null && ` · ${count.toLocaleString("en-US")}`}
      </span>
    </span>
  );
}
