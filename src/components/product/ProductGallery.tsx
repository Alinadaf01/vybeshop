import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface ProductGalleryProps {
  images: string[];
  productName: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export function ProductGallery({ images, productName, activeIndex, onActiveIndexChange }: ProductGalleryProps) {
  const thumbRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index - 1 + images.length) % images.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + 1) % images.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = images.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      onActiveIndexChange(nextIndex);
      thumbRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={`${productName} — تصویر ${activeIndex + 1} از ${images.length}`}
        className="flex aspect-square w-full items-end overflow-hidden rounded-xl border border-gray-100 bg-[repeating-linear-gradient(135deg,#E4E4E2_0_10px,#F5F5F3_10px_20px)] p-6"
      >
        <span dir="ltr" aria-hidden="true" className="font-mono text-micro leading-[1.6] text-gray-800">
          {productName} &middot; IMAGE {activeIndex + 1}/{images.length}
        </span>
      </div>
      <div role="tablist" aria-label="گالری تصاویر محصول" className="grid grid-cols-4 gap-3 md:grid-cols-5">
        {images.map((image, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={image}
              ref={(el) => {
                thumbRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`نمایش تصویر ${index + 1} از ${images.length}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onActiveIndexChange(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "flex aspect-square items-end rounded-md bg-[repeating-linear-gradient(45deg,#E4E4E2_0_8px,#F5F5F3_8px_16px)] p-2 text-start transition-colors duration-fast",
                selected ? "border-2 border-graphite" : "border border-gray-100 hover:border-titanium",
              )}
            >
              <span dir="ltr" className="font-mono text-micro text-gray-800">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
