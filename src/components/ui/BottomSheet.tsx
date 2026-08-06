import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/useDialog";
import { IconButton } from "@/components/ui/IconButton";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const containerRef = useDialog(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end bg-overlay">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full flex-col gap-4 rounded-t-xl bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-h4 font-semibold">{title}</span>
          <IconButton variant="ghost" aria-label="بستن" onClick={onClose}>
            &#10005;
          </IconButton>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
