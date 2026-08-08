import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PrerenderLayout } from "@/app/PrerenderLayout";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import CatalogPage from "@/pages/CatalogPage";
import CategoriesPage from "@/pages/CategoriesPage";
import { getRouteHead, listAllRoutes, type RouteHead } from "@/lib/seoRoutes";
import { getSiteSettings, getCatalog } from "@/lib/api";

export { listAllRoutes };

const BODY_PAGES: Record<string, () => ReactElement> = {
  "/about": AboutPage,
  "/contact": ContactPage,
  "/catalog": CatalogPage,
  "/categories": CategoriesPage,
};

export interface PrerenderResult {
  head: RouteHead | null;
  /** Rendered <body> markup for the 4 fully-static routes, null for every
   * other route (those ship the plain CSR shell — see scripts/prerender.mjs). */
  body: string | null;
}

export async function renderRoute(path: string): Promise<PrerenderResult> {
  const head = getRouteHead(path);
  const Page = BODY_PAGES[path];
  if (!Page) return { head, body: null };

  // Footer (part of PrerenderLayout) reads site settings on every one of
  // these 4 pages; CatalogPage additionally reads the catalog file info.
  // Both go through the real getX() functions in src/lib/api.ts so the
  // static HTML matches what a live browser would render — prefetching
  // into a QueryClient before the synchronous renderToStaticMarkup call
  // means useQuery resolves from cache immediately instead of returning
  // isLoading on the first (and only) server render pass.
  const queryClient = new QueryClient();
  const prefetches = [queryClient.prefetchQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings })];
  if (path === "/catalog") {
    prefetches.push(queryClient.prefetchQuery({ queryKey: ["catalog"], queryFn: getCatalog }));
  }
  await Promise.all(prefetches);

  const body = renderToStaticMarkup(
    <StaticRouter location={path}>
      <PrerenderLayout queryClient={queryClient}>
        <Page />
      </PrerenderLayout>
    </StaticRouter>,
  );
  return { head, body };
}
