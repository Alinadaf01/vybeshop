import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Footer } from "@/components/layout/Footer";
import { AppProviders } from "@/app/AppProviders";
import { SkipSeoProvider } from "@/lib/prerenderContext";

/**
 * Build-time-only counterpart to RootLayout, used by src/entry-server.tsx.
 * Renders the same chrome but omits <ScrollRestoration /> — that component
 * requires the live data-router context from RouterProvider and isn't
 * meaningful in static markup (main.tsx does a fresh client render, not
 * hydration, so nothing here needs to match the CSR DOM exactly).
 *
 * Owns its own AppProviders (same one main.tsx uses) instead of assuming
 * whatever wraps it already provides auth/toast/query context — Header
 * reads useAuth() and useQuery() regardless of which entry point rendered
 * it, so both entry points must supply the same provider stack.
 */
export function PrerenderLayout({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <SkipSeoProvider value={true}>
      <AppProviders queryClient={queryClient}>
        <div className="flex min-h-screen flex-col bg-fog-white text-graphite">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-body focus:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
          >
            رفتن به محتوای اصلی
          </a>
          <Header menuOpen={false} onMenuToggle={() => {}} />
          <MobileMenu open={false} onClose={() => {}} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </AppProviders>
    </SkipSeoProvider>
  );
}
