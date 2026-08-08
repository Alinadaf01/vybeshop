// Build/server-only: imports the full product+blog+category dataset to
// resolve metadata by path. Used by src/entry-server.tsx (SSR bundle) and
// scripts/generate-sitemap.mjs — never import this from a page component or
// it drags the entire catalog into the client bundle. Pages build their own
// <Seo> props directly from data they already have loaded (see AboutPage,
// ProductDetailPage, etc.) using the pure helpers in src/lib/seo.ts instead.
import { existsSync } from "node:fs";
import path from "node:path";
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
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl, buildProductJsonLd, buildArticleJsonLd } from "@/lib/seo";

// npm scripts (build/postbuild/prerender) always run with cwd = repo root,
// so this is reliable regardless of whether this file executes from source
// or from the Vite SSR bundle in dist-ssr/ (import.meta.url would point at
// the bundle's location instead, which is the wrong base for this path).
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

/** og:image / JSON-LD image must exist on disk at build time — link-preview
 * bots (Telegram, Instagram, etc.) don't execute JS, so a client-side
 * <Image>-style onError fallback never runs for them. Real product/blog
 * photos haven't been delivered yet, so every one of them falls back to the
 * default OG image today; this starts resolving correctly the moment real
 * files land in public/, no code change needed. */
function resolveOgImage(imagePath: string | undefined): string {
  if (!imagePath) return DEFAULT_OG_IMAGE;
  return existsSync(path.join(PUBLIC_DIR, imagePath)) ? imagePath : DEFAULT_OG_IMAGE;
}

export interface RouteHead {
  title: string;
  description: string;
  path: string;
  image: string;
  type: "website" | "article" | "product";
  jsonLd?: object;
  /** true only for "/" — title is already "VYBE — <tagline>", don't append " · VYBE" again. */
  titleIsRaw?: boolean;
}

/** Resolves title/description/OG/JSON-LD for any concrete route path. Returns
 * null for paths with no defined metadata (e.g. 404s) — caller should skip those. */
export function getRouteHead(path: string): RouteHead | null {
  if (path === "/") {
    return {
      title: `${SITE_NAME} — ${homeContent.seo.title}`,
      description: homeContent.seo.description,
      path,
      image: DEFAULT_OG_IMAGE,
      type: "website",
      titleIsRaw: true,
    };
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
    const image = resolveOgImage(product.images[0]);
    return {
      title: product.name,
      description: product.shortDescription,
      path,
      image,
      type: "product",
      jsonLd: buildProductJsonLd(product, category?.name, absoluteUrl(image)),
    };
  }
  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    const post = blogPosts.find((p) => p.slug === slug);
    if (!post) return null;
    const image = resolveOgImage(post.coverImage);
    return {
      title: post.title,
      description: post.excerpt,
      path,
      image,
      type: "article",
      jsonLd: buildArticleJsonLd(post, absoluteUrl(image)),
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
