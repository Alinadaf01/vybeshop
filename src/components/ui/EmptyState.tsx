import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** A linear icon matching what's empty — e.g. ShoppingBag for an empty
   * cart, MapPin for no addresses. Defaults to a generic empty-tray icon. */
  icon?: LucideIcon;
}

export function EmptyState({ title, description, action, className, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-100 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden="true" size={48} strokeWidth={1.5} className="text-silver" />
      <span className="text-h4 font-h4">{title}</span>
      {description && <p className="m-0 max-w-[280px] text-small leading-[1.6] text-gray-800">{description}</p>}
      {action}
    </div>
  );
}
