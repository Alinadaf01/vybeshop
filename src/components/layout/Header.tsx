import { useEffect, useState } from "react";
import { Link, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navLinks } from "@/app/navigation";
import { VybeWordmark } from "@/components/brand/VybeWordmark";
import { useAuth } from "@/lib/AuthContext";

export interface HeaderProps {
  onMenuOpen: () => void;
  cartCount?: number;
}

export function Header({ onMenuOpen, cartCount = 0 }: HeaderProps) {
  const [opaque, setOpaque] = useState(true);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let intersectionObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    function attach(sentinel: Element) {
      setOpaque(false);
      // The hero's height ends exactly at the viewport edge, so the sentinel
      // sits at 0px visible right at page load — an unstable boundary that
      // can read as "not intersecting" even though the hero fills the
      // screen. rootMargin expands the effective viewport by 80px (the
      // design's own scroll threshold for turning the header opaque) so the
      // initial state is unambiguous.
      intersectionObserver = new IntersectionObserver(([entry]) => setOpaque(!entry.isIntersecting), {
        threshold: 0,
        rootMargin: "0px 0px 80px 0px",
      });
      intersectionObserver.observe(sentinel);
    }

    const existing = document.getElementById("hero-sentinel");
    if (existing) {
      attach(existing);
    } else {
      // Pages with a hero (e.g. Home) are lazy-loaded behind Suspense, so
      // the sentinel may not exist yet on Header's own mount — watch the DOM
      // until it appears instead of checking only once.
      setOpaque(true);
      mutationObserver = new MutationObserver(() => {
        const sentinel = document.getElementById("hero-sentinel");
        if (sentinel) {
          mutationObserver?.disconnect();
          attach(sentinel);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [location.pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-[72px] items-center gap-8 px-5 transition-colors duration-base xl:px-10",
        opaque ? "bg-graphite" : "bg-transparent",
      )}
    >
      <Link to="/" aria-label="VYBE — صفحه اصلی" className="shrink-0 p-1">
        <VybeWordmark aria-hidden="true" className="h-8 w-auto text-fog-white" />
      </Link>

      <nav className="hidden flex-1 items-center gap-6 overflow-hidden whitespace-nowrap lg:flex">
        {navLinks.map((link) => (
          <RouterNavLink
            key={link.href}
            to={link.href}
            end={link.href === "/"}
            className={({ isActive }) =>
              cn(
                "border-b-2 py-6 text-body font-medium no-underline transition-colors duration-fast",
                isActive ? "border-cyan text-white" : "border-transparent text-silver hover:text-white",
              )
            }
          >
            {link.label}
          </RouterNavLink>
        ))}
      </nav>

      <div className="ms-auto flex shrink-0 items-center gap-5">
        <button
          type="button"
          className="rounded-sm border border-edge px-2 py-1.5 font-mono text-micro text-silver hover:text-white"
        >
          SEARCH
        </button>
        <div className="relative flex items-center">
          <button
            type="button"
            className="rounded-sm border border-edge px-2 py-1.5 font-mono text-micro text-silver hover:text-white"
          >
            CART
          </button>
          {cartCount > 0 && (
            <span
              dir="ltr"
              className="absolute -start-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cyan px-1 font-mono text-micro text-graphite"
            >
              {cartCount}
            </span>
          )}
        </div>
        <Link
          to={isAuthenticated ? "/account" : "/auth"}
          className="hidden rounded-sm border border-edge px-2 py-1.5 font-mono text-micro text-silver no-underline hover:text-white sm:block"
        >
          ACCOUNT
        </Link>
      </div>

      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="باز کردن منو"
        className="order-last size-11 rounded-md border border-edge bg-transparent font-mono text-micro text-fog-white lg:hidden"
      >
        MENU
      </button>
    </header>
  );
}
