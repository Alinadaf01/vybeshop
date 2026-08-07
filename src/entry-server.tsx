import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { PrerenderLayout } from "@/app/PrerenderLayout";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import CatalogPage from "@/pages/CatalogPage";
import CategoriesPage from "@/pages/CategoriesPage";
import { getRouteHead, listAllRoutes, type RouteHead } from "@/lib/seoRoutes";

export { listAllRoutes };
import { SkipSeoProvider } from "@/lib/prerenderContext";

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

export function renderRoute(path: string): PrerenderResult {
  const head = getRouteHead(path);
  const Page = BODY_PAGES[path];
  if (!Page) return { head, body: null };

  const body = renderToStaticMarkup(
    <SkipSeoProvider value={true}>
      <StaticRouter location={path}>
        <PrerenderLayout>
          <Page />
        </PrerenderLayout>
      </StaticRouter>
    </SkipSeoProvider>,
  );
  return { head, body };
}
