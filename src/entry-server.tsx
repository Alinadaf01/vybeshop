import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";
import { PrerenderLayout } from "@/app/PrerenderLayout";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import FaqPage from "@/pages/FaqPage";
import CatalogPage from "@/pages/CatalogPage";
import CategoriesPage from "@/pages/CategoriesPage";
import HomePage from "@/pages/HomePage";
import BlogListPage from "@/pages/BlogListPage";
import { getRouteHead, listAllRoutes, type RouteHead } from "@/lib/seoRoutes";
import { getSiteSettings, getCatalog, getProducts, getCategories, getBlogPosts, getHomepage } from "@/lib/api";

export { listAllRoutes };

const BODY_PAGES: Record<string, () => ReactElement> = {
  "/": HomePage,
  "/about": AboutPage,
  "/faq": FaqPage,
  "/contact": ContactPage,
  "/catalog": CatalogPage,
  "/categories": CategoriesPage,
  "/blog": BlogListPage,
};

// Extra queries each route's page component fetches client-side, beyond the
// site-settings/footer fetch every page needs — prefetched here so the
// dehydrated state covers everything the page renders on its first paint,
// not just the chrome around it.
//
// Deliberately `qc.fetchQuery`, not `qc.prefetchQuery` -- prefetchQuery is
// fire-and-forget by design (React Query docs: it never rejects, a failed
// fetch just leaves the query in an error state in the cache). That silently
// swallowed exactly the failure this needs to catch: a real prerender build
// where the backend was briefly unreachable, so every one of these silently
// resolved to the withFallback() static content, and the build "succeeded"
// with placeholder category names and the local hero.jpg baked into the
// static HTML -- confirmed live, this is not a hypothetical. fetchQuery
// throws on failure, so a truly unreachable backend now fails the build
// (see apiFetch in src/lib/api.ts for the matching half of this fix)
// instead of shipping wrong content with no warning.
const ROUTE_PREFETCHES: Record<string, (queryClient: QueryClient) => Promise<unknown>[]> = {
  "/catalog": (qc) => [qc.fetchQuery({ queryKey: ["catalog"], queryFn: getCatalog })],
  "/": (qc) => [
    qc.fetchQuery({ queryKey: ["products", "home"], queryFn: () => getProducts({ pageSize: 24 }) }),
    qc.fetchQuery({ queryKey: ["categories"], queryFn: () => getCategories() }),
    qc.fetchQuery({ queryKey: ["blogPosts", "home"], queryFn: () => getBlogPosts({ pageSize: 3 }) }),
    // Without this, the dehydrated cache is missing the "homepage" query key
    // that HomePage.tsx reads, so hydration refetches it client-side and the
    // hero/showcase/community sections flash from static defaults to real
    // content on first load (HOMEPAGE-ADMIN-TASK.md §5: "این را حتماً تست کن").
    qc.fetchQuery({ queryKey: ["homepage"], queryFn: getHomepage }),
  ],
  "/blog": (qc) => [
    qc.fetchQuery({
      queryKey: ["blog-posts", { category: undefined, page: 1 }],
      queryFn: () => getBlogPosts({ page: 1, pageSize: 9 }),
    }),
  ],
};

export interface PrerenderResult {
  head: RouteHead | null;
  /** Rendered <body> markup for the fully-static routes, null for every
   * other route (those ship the plain CSR shell — see scripts/prerender.mjs). */
  body: string | null;
  /** React Query cache snapshot for `body` routes — embedded into the HTML
   * and re-hydrated by main.tsx via `hydrate()` (§7.1: "prefetch queries in
   * entry-server, dehydrate cache into HTML so hydration doesn't
   * refetch/flash"). The client still does a fresh CSR mount rather than
   * true DOM hydration (see PrerenderLayout.tsx's own note on why), so this
   * targets the specific symptom the task called out — a loading skeleton
   * flashing before data pops in — without the larger, separately-scoped
   * risk of rewriting the render strategy itself. */
  dehydratedState: DehydratedState | null;
}

export async function renderRoute(path: string): Promise<PrerenderResult> {
  const head = getRouteHead(path);
  const Page = BODY_PAGES[path];
  if (!Page) return { head, body: null, dehydratedState: null };

  // Footer (part of PrerenderLayout) reads site settings on every static
  // page; some pages fetch more (see ROUTE_PREFETCHES). All go through the
  // real getX() functions in src/lib/api.ts so the static HTML matches what
  // a live browser would render — prefetching into a QueryClient before the
  // synchronous renderToStaticMarkup call means useQuery resolves from
  // cache immediately instead of returning isLoading on the first (and
  // only) server render pass.
  const queryClient = new QueryClient();
  const prefetches: Promise<unknown>[] = [queryClient.fetchQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings })];
  prefetches.push(...(ROUTE_PREFETCHES[path]?.(queryClient) ?? []));
  await Promise.all(prefetches);

  const body = renderToStaticMarkup(
    <StaticRouter location={path}>
      <PrerenderLayout queryClient={queryClient}>
        <Page />
      </PrerenderLayout>
    </StaticRouter>,
  );
  return { head, body, dehydratedState: dehydrate(queryClient) };
}
