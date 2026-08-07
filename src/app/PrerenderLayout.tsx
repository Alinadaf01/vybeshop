import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Footer } from "@/components/layout/Footer";

/**
 * Build-time-only counterpart to RootLayout, used by src/entry-server.tsx.
 * Renders the same chrome but omits <ScrollRestoration /> — that component
 * requires the live data-router context from RouterProvider and isn't
 * meaningful in static markup (main.tsx does a fresh client render, not
 * hydration, so nothing here needs to match the CSR DOM exactly).
 */
export function PrerenderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fog-white text-graphite">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-body focus:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        رفتن به محتوای اصلی
      </a>
      <Header onMenuOpen={() => {}} />
      <MobileMenu open={false} onClose={() => {}} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
