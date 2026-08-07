import type { Product } from "@/types/product";
import type { BlogPost } from "@/types/blog";

export const SITE_NAME = "VYBE";
// vybeshop.ir is the real production domain (canonical, no www — the www
// variant redirects at the DNS/Vercel level). Override via VITE_SITE_URL for
// local/preview builds if ever needed; everything below reads from this
// single constant so the domain only has to change in one place.
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ?? "https://vybeshop.ir";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** title here is the raw page title (e.g. "درباره ما"); Seo.tsx and the
 * prerender script both call this once to build the final "<page> · VYBE"
 * string, so it's never applied twice. */
export function pageTitle(title: string): string {
  return title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
}

/** imageUrl must be an absolute URL the caller has already resolved (client
 * pages pass absoluteUrl(product.images[0]) directly; the build-time
 * prerender path in seoRoutes.ts resolves it through resolveOgImage() first
 * so JSON-LD never points at a file that doesn't exist on disk). */
export function buildProductJsonLd(product: Product, categoryName: string | undefined, imageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [imageUrl],
    description: product.shortDescription,
    sku: product.sku,
    category: categoryName,
    // Prices are authored in Toman (see formatPrice); IRR is the only valid ISO
    // currency code for Iran so it's used here as-is, matching common local practice.
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "IRR",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

/** See buildProductJsonLd's imageUrl note — same reasoning here. */
export function buildArticleJsonLd(post: BlogPost, imageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: [imageUrl],
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    description: post.excerpt,
  };
}
