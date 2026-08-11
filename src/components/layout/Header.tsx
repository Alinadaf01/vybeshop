import { useEffect, useState } from "react";
import { Link, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { navLinks } from "@/app/navigation";
import { VybeWordmark } from "@/components/brand/VybeWordmark";
import { useAuth } from "@/lib/AuthContext";
import { useSkipSeo } from "@/lib/prerenderContext";
import { getCart } from "@/lib/api";

export interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

// Icon + mono label side by side on desktop (8px gap per the brand book),
// icon-only with a 44x44 touch target on mobile — same bordered pill either way.
function HeaderIconButton({
  icon: Icon,
  label,
  ariaLabel,
  ...rest
}: {
  icon: typeof Search;
  label: string;
  ariaLabel: string;
} & (
  | { as?: "button"; onClick: () => void }
  | { as: "link"; to: string }
)) {
  const className = cn(
    "flex size-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-edge text-silver no-underline transition-colors duration-fast hover:text-white",
    "lg:h-auto lg:w-auto lg:px-2 lg:py-1.5",
  );
  const content = (
    <>
      <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
      <span dir="ltr" className="hidden font-mono text-micro lg:inline">
        {label}
      </span>
    </>
  );
  if (rest.as === "link") {
    return (
      <Link to={rest.to} aria-label={ariaLabel} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={rest.onClick} aria-label={ariaLabel} className={className}>
      {content}
    </button>
  );
}

export function Header({ menuOpen, onMenuToggle }: HeaderProps) {
  const [opaque, setOpaque] = useState(true);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // useSkipSeo() doubles as "are we in the build-time prerender pass" here —
  // there's no real visitor/cart during prerendering, and firing a network
  // call from inside the synchronous renderToStaticMarkup call would either
  // hang the build or log an unhandled rejection once it outlives the render.
  const isPrerendering = useSkipSeo();
  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    staleTime: 30_000,
    enabled: !isPrerendering,
  });
  const cartCount = cart?.itemCount ?? 0;

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
        <HeaderIconButton as="link" to="/search" icon={Search} label="SEARCH" ariaLabel="جستجو" />
        <div className="relative flex items-center">
          <HeaderIconButton as="link" to="/cart" icon={ShoppingBag} label="CART" ariaLabel="سبد خرید" />
          {cartCount > 0 && (
            <span
              dir="ltr"
              className="pointer-events-none absolute -start-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cyan px-1 font-mono text-micro text-graphite"
            >
              {cartCount}
            </span>
          )}
        </div>
        <HeaderIconButton
          as="link"
          to={isAuthenticated ? "/account" : "/auth"}
          icon={User}
          label="ACCOUNT"
          ariaLabel="حساب کاربری"
        />
      </div>

      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
        className="order-last grid size-11 shrink-0 place-items-center rounded-md border border-edge bg-transparent text-fog-white lg:hidden"
      >
        {menuOpen ? <X aria-hidden="true" size={20} strokeWidth={1.5} /> : <Menu aria-hidden="true" size={20} strokeWidth={1.5} />}
      </button>
    </header>
  );
}
