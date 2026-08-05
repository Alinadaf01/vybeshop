import { createContext, useContext } from "react";
import type { ToastItemProps } from "@/components/ui/Toast";

export interface ToastContextValue {
  showToast: (toast: ToastItemProps) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
