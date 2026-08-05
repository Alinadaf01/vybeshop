import { cn } from "@/lib/cn";

export interface ColorSwatchProps {
  hex: string;
  name: string;
  selected?: boolean;
  outOfStock?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ColorSwatch({ hex, name, selected, outOfStock, onClick, className }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={outOfStock}
      aria-label={outOfStock ? `${name} — ناموجود` : name}
      aria-pressed={selected}
      title={name}
      style={{ backgroundColor: hex }}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full border border-silver focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
        selected && "outline outline-2 outline-offset-[3px] outline-graphite",
        outOfStock && "cursor-not-allowed opacity-40",
        !outOfStock && "cursor-pointer",
        className,
      )}
    >
      {outOfStock && (
        <span aria-hidden="true" className="text-caption text-graphite">
          &#10005;
        </span>
      )}
    </button>
  );
}
