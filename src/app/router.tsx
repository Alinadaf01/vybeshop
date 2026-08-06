import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PageLoadingFallback } from "@/pages/PageLoadingFallback";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const CatalogPage = lazy(() => import("@/pages/CatalogPage"));
const BlogListPage = lazy(() => import("@/pages/BlogListPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: "products", element: withSuspense(<ProductsPage />) },
      { path: "products/:slug", element: withSuspense(<ProductDetailPage />) },
      { path: "categories", element: withSuspense(<CategoriesPage />) },
      { path: "catalog", element: withSuspense(<CatalogPage />) },
      { path: "blog", element: withSuspense(<BlogListPage />) },
      { path: "blog/:slug", element: withSuspense(<BlogPostPage />) },
      { path: "about", element: withSuspense(<AboutPage />) },
      { path: "contact", element: withSuspense(<ContactPage />) },
      { path: "search", element: withSuspense(<SearchPage />) },
      { path: "dev/components", lazy: () => import("@/pages/dev/DevComponentsPage").then((m) => ({ Component: m.DevComponentsPage })) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
