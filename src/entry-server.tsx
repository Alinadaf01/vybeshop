import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";
import { PrerenderLayout } from "@/app/PrerenderLayout";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
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
  "/contact": ContactPage,
  "/catalog": CatalogPage,
  "/categories": CategoriesPage,
  "/blog": BlogListPage,
};

// Extra queries each route's page component fetches client-side, beyond the
// site-settings/footer fetch every page needs — prefetched here so the
// dehydrated state covers everything the page renders on its first paint,
// not just the chrome around it.
const ROUTE_PREFETCHES: Record<string, (queryClient: QueryClient) => Promise<void>[]> = {
  "/catalog": (qc) => [qc.prefetchQuery({ queryKey: ["catalog"], queryFn: getCatalog })],
  "/": (qc) => [
    qc.prefetchQuery({ queryKey: ["products", "home"], queryFn: () => getProducts({ pageSize: 24 }) }),
    qc.prefetchQuery({ queryKey: ["categories"], queryFn: () => getCategories() }),
    qc.prefetchQuery({ queryKey: ["blogPosts", "home"], queryFn: () => getBlogPosts({ pageSize: 3 }) }),
    // Without this, the dehydrated cache is missing the "homepage" query key
    // that HomePage.tsx reads, so hydration refetches it client-side and the
    // hero/showcase/community sections flash from static defaults to real
    // content on first load (HOMEPAGE-ADMIN-TASK.md §5: "این را حتماً تست کن").
    qc.prefetchQuery({ queryKey: ["homepage"], queryFn: getHomepage }),
  ],
  "/blog": (qc) => [
    qc.prefetchQuery({
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
  const prefetches = [queryClient.prefetchQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings })];
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
