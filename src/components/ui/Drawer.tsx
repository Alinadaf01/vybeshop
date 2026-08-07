import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/useDialog";
import { IconButton } from "@/components/ui/IconButton";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const containerRef = useDialog(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-start bg-overlay">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-3/4 max-w-sm flex-col gap-4 bg-white p-6 transition-transform duration-base"
      >
        <div className="flex items-center justify-between">
          <span className="text-h4 font-h4">{title}</span>
          <IconButton variant="ghost" aria-label="بستن" onClick={onClose}>
            &#10005;
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
