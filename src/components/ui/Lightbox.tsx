import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/useDialog";
import { IconButton } from "@/components/ui/IconButton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export interface LightboxProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  title: string;
}

export function Lightbox({ open, onClose, images, index, onIndexChange, title }: LightboxProps) {
  const containerRef = useDialog(open, onClose);
  const [failed, setFailed] = useState(false);

  const goPrevious = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  useEffect(() => {
    setFailed(false);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goPrevious();
      else if (event.key === "ArrowLeft") goNext();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, images.length]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col gap-3 bg-graphite p-6">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex flex-1 flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-body text-fog-white">{title}</span>
          <IconButton aria-label="بستن" onClick={onClose}>
            &#10005;
          </IconButton>
        </div>
        <div className="grid flex-1 place-items-center overflow-hidden rounded-md border border-edge">
          {failed ? (
            <ImagePlaceholder
              caption={`${title} — تصویر ${index + 1} از ${images.length}`}
              dark
              className="size-full"
            />
          ) : (
            <img
              src={images[index]}
              alt={`${title} — تصویر ${index + 1} از ${images.length}`}
              onError={() => setFailed(true)}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-micro text-silver">
          <button type="button" onClick={goPrevious} className="text-silver hover:text-fog-white">
            &lsaquo; قبلی
          </button>
          <span dir="ltr">
            {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </span>
          <button type="button" onClick={goNext} className="text-silver hover:text-fog-white">
            بعدی &rsaquo;
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
