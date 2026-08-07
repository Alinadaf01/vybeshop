import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navLinks } from "@/app/navigation";
import { useDialog } from "@/lib/useDialog";
import { VybeWordmark } from "@/components/brand/VybeWordmark";

export interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const socialLinks = ["INSTAGRAM", "TELEGRAM", "PINTEREST"];

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const containerRef = useDialog(open, onClose);
  const location = useLocation();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!open) return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="منوی ناوبری"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-graphite text-fog-white transition-all duration-base",
        entered ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
    >
      <div className="flex h-[72px] items-center justify-between px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن منو"
          className="size-11 rounded-md border border-edge bg-transparent text-body text-fog-white"
        >
          &#10005;
        </button>
        <VybeWordmark aria-hidden="true" className="h-8 w-auto p-1" />
      </div>

      <nav className="flex flex-1 flex-col items-start gap-6 overflow-y-auto px-5 py-6">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              "text-h3 font-semibold no-underline",
              location.pathname === link.href ? "text-white" : "text-silver hover:text-white",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4 border-t border-edge p-5">
        <div className="flex items-center gap-2 rounded-md border border-edge p-3">
          <span dir="ltr" className="font-mono text-micro text-titanium">
            SEARCH
          </span>
          <span className="text-small text-titanium">جستجوی محصول</span>
        </div>
        <div dir="ltr" className="flex gap-4 font-mono text-micro text-silver">
          {socialLinks.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
