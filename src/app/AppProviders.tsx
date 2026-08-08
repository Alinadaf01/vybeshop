import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * The app's full provider stack — every entry point that renders the React
 * tree (main.tsx for the browser, PrerenderLayout.tsx for the build-time
 * static pages) must go through this, not assemble its own copy. That's
 * exactly what broke `npm run build`: Header started calling useAuth() and
 * only main.tsx's tree had an AuthProvider, so the prerender pass crashed.
 * One shared component makes that class of bug impossible — add a provider
 * here once and every entry point gets it.
 *
 * Takes queryClient as a prop rather than owning it: main.tsx wants one
 * QueryClient for the whole app's lifetime, entry-server.tsx wants a fresh
 * one per route with data pre-fetched into it before the synchronous
 * renderToStaticMarkup call.
 */
export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
