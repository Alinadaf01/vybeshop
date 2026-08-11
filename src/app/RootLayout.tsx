import { useEffect, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Footer } from "@/components/layout/Footer";
import { SupportModeBanner } from "@/components/layout/SupportModeBanner";
import { reportPageView } from "@/lib/api";

export function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // useEffect never runs during the build-time prerender pass (only the
  // render phase does), so this is safely client-only despite living in a
  // component that also gets prerendered for 4 static routes.
  useEffect(() => {
    reportPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-fog-white text-graphite">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-body focus:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        رفتن به محتوای اصلی
      </a>
      <SupportModeBanner />
      <Header onMenuOpen={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* tabIndex=-1: not in tab order, but makes the skip link above actually
          move keyboard/screen-reader focus here (not just scroll position). */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
