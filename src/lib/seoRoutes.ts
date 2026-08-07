// Build/server-only: imports the full product+blog+category dataset to
// resolve metadata by path. Used by src/entry-server.tsx (SSR bundle) and
// scripts/generate-sitemap.mjs — never import this from a page component or
// it drags the entire catalog into the client bundle. Pages build their own
// <Seo> props directly from data they already have loaded (see AboutPage,
// ProductDetailPage, etc.) using the pure helpers in src/lib/seo.ts instead.
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { blogPosts } from "@/data/blog";
import { homeContent } from "@/content/home";
import { aboutContent } from "@/content/about";
import { contactContent } from "@/content/contact";
import { categoriesContent } from "@/content/categories";
import { catalogContent } from "@/content/catalog";
import { blogListContent } from "@/content/blog";
import { productsContent } from "@/content/products";
import { SITE_NAME, buildProductJsonLd, buildArticleJsonLd } from "@/lib/seo";

const DEFAULT_OG_IMAGE = "/images/og/default.jpg";

export interface RouteHead {
  title: string;
  description: string;
  path: string;
  image: string;
  type: "website" | "article" | "product";
  jsonLd?: object;
}

/** Resolves title/description/OG/JSON-LD for any concrete route path. Returns
 * null for paths with no defined metadata (e.g. 404s) — caller should skip those. */
export function getRouteHead(path: string): RouteHead | null {
  if (path === "/") {
    return { title: SITE_NAME, description: homeContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/about") {
    return { title: aboutContent.seo.title, description: aboutContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/contact") {
    return { title: contactContent.seo.title, description: contactContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/categories") {
    return { title: categoriesContent.seo.title, description: categoriesContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/catalog") {
    return { title: catalogContent.seo.title, description: catalogContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/blog") {
    return { title: blogListContent.seo.title, description: blogListContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path === "/products") {
    return { title: productsContent.seo.title, description: productsContent.seo.description, path, image: DEFAULT_OG_IMAGE, type: "website" };
  }
  if (path.startsWith("/products/")) {
    const slug = path.slice("/products/".length);
    const product = products.find((p) => p.slug === slug);
    if (!product) return null;
    const category = categories.find((c) => c.slug === product.category);
    return {
      title: product.name,
      description: product.shortDescription,
      path,
      image: product.images[0],
      type: "product",
      jsonLd: buildProductJsonLd(product, category?.name),
    };
  }
  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    const post = blogPosts.find((p) => p.slug === slug);
    if (!post) return null;
    return {
      title: post.title,
      description: post.excerpt,
      path,
      image: post.coverImage,
      type: "article",
      jsonLd: buildArticleJsonLd(post),
    };
  }
  return null;
}

/** Every concrete, indexable route in the site — powers both sitemap.xml and the
 * build-time static-page generator. Excludes /search, /dev/*, and error routes. */
export function listAllRoutes(): string[] {
  return [
    "/",
    "/products",
    "/categories",
    "/catalog",
    "/blog",
    "/about",
    "/contact",
    ...products.map((p) => `/products/${p.slug}`),
    ...blogPosts.map((p) => `/blog/${p.slug}`),
  ];
}
