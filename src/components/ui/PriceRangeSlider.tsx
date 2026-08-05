import { cn } from "@/lib/cn";

export interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1000,
  formatValue = (n) => n.toLocaleString("en-US"),
  className,
}: PriceRangeSliderProps) {
  const [low, high] = value;
  const range = max - min || 1;
  const lowPct = ((low - min) / range) * 100;
  const highPct = ((high - min) / range) * 100;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div dir="ltr" className="relative flex h-6 items-center">
        <span className="absolute inset-x-0 h-0.5 bg-gray-100" />
        <span
          className="absolute h-0.5 bg-graphite"
          style={{ insetInlineStart: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
        <input
          type="range"
          className="range-thumb"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label="حداقل قیمت"
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
        />
        <input
          type="range"
          className="range-thumb"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label="حداکثر قیمت"
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
        />
      </div>
      <div dir="ltr" className="flex justify-between font-mono text-caption text-gray-800">
        <span>{formatValue(low)}</span>
        <span>{formatValue(high)}</span>
      </div>
    </div>
  );
}
