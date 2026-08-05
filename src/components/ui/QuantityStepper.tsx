import { cn } from "@/lib/cn";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
  "aria-label": ariaLabel = "تعداد",
  className,
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <span
      className={cn(
        "inline-flex w-[132px] items-center overflow-hidden rounded-md border transition-colors duration-fast",
        disabled ? "border-gray-100 bg-fog-white text-silver" : "border-silver",
        className,
      )}
    >
      <button
        type="button"
        aria-label="کاهش تعداد"
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="size-11 border-0 bg-white text-h4 hover:bg-fog-white disabled:cursor-not-allowed disabled:bg-transparent disabled:text-silver"
      >
        &minus;
      </button>
      <span
        role="spinbutton"
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        dir="ltr"
        className="flex-1 text-center font-mono text-small"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="افزایش تعداد"
        disabled={!canIncrease}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="size-11 border-0 bg-white text-h4 hover:bg-fog-white disabled:cursor-not-allowed disabled:bg-transparent disabled:text-silver"
      >
        +
      </button>
    </span>
  );
}
