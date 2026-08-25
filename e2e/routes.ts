// The real, user-facing routes — shared by contrast.spec.ts and
// accessibility.spec.ts so both checks always cover the same set.
// /dev/components and /search are excluded: internal tooling / not yet built.
export const pagesToCheck = [
  { path: "/", label: "/" },
  { path: "/products", label: "/products" },
  { path: "/products/product-b", label: "/products/:slug" },
  { path: "/categories", label: "/categories" },
  { path: "/catalog", label: "/catalog" },
  { path: "/blog", label: "/blog" },
  { path: "/blog/blog-1", label: "/blog/:slug" },
  { path: "/about", label: "/about" },
  { path: "/contact", label: "/contact" },
  { path: "/auth", label: "/auth" },
];
