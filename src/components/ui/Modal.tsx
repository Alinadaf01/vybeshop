import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/useDialog";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const containerRef = useDialog(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-overlay p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[360px] flex-col gap-4 rounded-lg bg-white p-8"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
