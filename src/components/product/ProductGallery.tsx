import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";

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
      <Image
        key={activeIndex}
        src={images[activeIndex]}
        alt={images.length > 0 ? `${productName} — تصویر ${activeIndex + 1} از ${images.length}` : productName}
        width={1200}
        height={1200}
        priority
        className="aspect-square w-full rounded-xl border border-gray-100 object-cover"
      />
      {/* یک عکس یعنی چیزی برای جابه‌جایی بین آن‌ها نیست — نوار تامبنیل تکراری
      نشان داده نمی‌شود (CONTENT-TASK.md §4: "گالری با تک‌تصویر درست کار کند"). */}
      {images.length > 1 && (
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
                  "overflow-hidden rounded-md transition-colors duration-fast",
                  selected ? "border-2 border-graphite" : "border border-gray-100 hover:border-titanium",
                )}
              >
                <Image src={image} alt="" width={200} height={200} className="aspect-square w-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
