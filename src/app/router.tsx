import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import { RequireAuth } from "@/app/RequireAuth";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PageLoadingFallback } from "@/pages/PageLoadingFallback";
// Bundled directly (not React.lazy): each of these chunks is small (a few KB
// gzip) and every one sits on a real navigation path, so the Suspense
// fallback → real-content swap was producing a large, measured layout shift
// (footer jumping ~220px once content replaced the ~50vh loading spinner —
// CLS ~0.38 against a 0.1 budget). Bundling them removes that swap entirely
// while keeping the shared "index" chunk comfortably under the 200KB gzip
// budget. ContactPage stays lazy: react-hook-form+zod+resolvers alone add
// ~27KB gzip that only /contact visitors need to pay for.
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CategoriesPage from "@/pages/CategoriesPage";
import CatalogPage from "@/pages/CatalogPage";
import BlogListPage from "@/pages/BlogListPage";
import BlogPostPage from "@/pages/BlogPostPage";
import AboutPage from "@/pages/AboutPage";

const ContactPage = lazy(() => import("@/pages/ContactPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:slug", element: <ProductDetailPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "catalog", element: <CatalogPage /> },
      { path: "blog", element: <BlogListPage /> },
      { path: "blog/:slug", element: <BlogPostPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: withSuspense(<ContactPage />) },
      { path: "search", element: withSuspense(<SearchPage />) },
      { path: "auth", element: withSuspense(<AuthPage />) },
      {
        path: "account",
        element: withSuspense(
          <RequireAuth>
            <AccountPage />
          </RequireAuth>,
        ),
      },
      { path: "dev/components", lazy: () => import("@/pages/dev/DevComponentsPage").then((m) => ({ Component: m.DevComponentsPage })) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
