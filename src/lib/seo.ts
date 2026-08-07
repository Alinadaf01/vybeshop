import type { Product } from "@/types/product";
import type { BlogPost } from "@/types/blog";

export const SITE_NAME = "VYBE";
// Placeholder until the site is deployed — set VITE_SITE_URL to the real production
// domain at deploy time (see F6 deploy task); everything below reads from this constant.
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ?? "https://vybe.ir";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** title here is the raw page title (e.g. "درباره ما"); Seo.tsx and the
 * prerender script both call this once to build the final "<page> · VYBE"
 * string, so it's never applied twice. */
export function pageTitle(title: string): string {
  return title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
}

export function buildProductJsonLd(product: Product, categoryName: string | undefined) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [absoluteUrl(product.images[0])],
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

export function buildArticleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: [absoluteUrl(post.coverImage)],
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    description: post.excerpt,
  };
}
