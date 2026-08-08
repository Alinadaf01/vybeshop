import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { ToastContext } from "@/lib/useToast";

export type ToastVariant = "success" | "danger" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItemProps {
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  className?: string;
}

const DOT_COLOR: Record<ToastVariant, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
};

export function ToastItem({ variant, message, action, className }: ToastItemProps) {
  return (
    <div
      role="status"
      className={cn("flex items-center gap-2 rounded-md bg-graphite p-4 text-fog-white", className)}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", DOT_COLOR[variant])} />
      <span className="text-small">{message}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="ms-auto text-small text-cyan">
          {action.label}
        </button>
      )}
    </div>
  );
}

interface QueuedToast extends ToastItemProps {
  id: number;
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);

  const showToast = useCallback((toast: ToastItemProps) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* document doesn't exist in Node — this now also renders during the
          build-time prerender pass (see PrerenderLayout), and there are
          never any toasts to show there anyway. */}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-6 start-6 z-[200] flex w-full max-w-sm flex-col gap-3">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} {...toast} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
