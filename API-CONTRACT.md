# API Contract — VYBE Frontend ↔ Backend

This is the exact shape the frontend expects from every endpoint it calls. It's generated from the real call sites in `src/lib/api.ts` — every function there is already written as `async function get...(): Promise<T>`, wrapped in an artificial network delay to simulate a real request. Wiring the real backend means replacing each function's **body** with a `fetch(...)` call; no component, hook, or type changes are needed as long as the response shapes below match.

Conventions used throughout:
- All response JSON is **camelCase**, matching the TypeScript types verbatim (`src/types/*.ts`). No snake_case → camelCase mapping needed frontend-side.
- All list endpoints return the same paginated envelope (see below).
- Prices are integers in **Toman** (not Rial), no decimals.
- Dates are ISO 8601 strings (`"2026-06-01"` or full datetime).
- Every `slug` is the primary lookup key for detail endpoints (not `id`).
- `dir="ltr"` is applied client-side to numeric/technical strings (SKUs, prices, dimensions) — the API does not need to format for direction.

## Pagination envelope

Every list endpoint returns:

```ts
interface PaginatedResponse<T> {
  count: number; // total matching items, not just this page
  next: string | null; // opaque cursor/URL for the next page, or null
  previous: string | null; // same, previous page
  results: T[];
}
```

`next`/`previous` are currently unused by the frontend (pagination is driven by `page`/`pageSize` query params and `Math.ceil(count / pageSize)`), but the field must be present — either a real URL or `null`.

---

## Products

### `GET /api/products/`

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `category` | string | category slug |
| `search` | string | matches against name + shortDescription |
| `ordering` | `"price" \| "-price" \| "name" \| "-name"` | leading `-` = descending |
| `minPrice` | number | inclusive |
| `maxPrice` | number | inclusive |
| `inStock` | boolean | `true` → only `inStock: true` items |
| `page` | number | 1-indexed |
| `pageSize` | number | default 12 |

Response: `PaginatedResponse<Product>`

```ts
interface Product {
  id: string;
  sku: string;              // e.g. "VYBE-STA-002" — always rendered dir="ltr"
  slug: string;
  name: string;
  shortDescription: string; // card/list copy
  description: string;      // full product-page copy
  price: number;            // Toman, integer
  images: string[];         // ordered, first = primary/OG image
  category: string;         // category slug, not name
  colors: ColorOption[];
  material: string;
  dimensions: { w: number; h: number; d: number }; // mm
  weight: number;           // grams
  layerHeight: number;      // mm
  inStock: boolean;
  stockCount: number;
}

interface ColorOption {
  name: string;
  hex: string;    // "#RRGGBB"
  inStock: boolean;
}
```

### `GET /api/products/{slug}/`

Response: single `Product` (shape above).
**404** if slug doesn't exist — the frontend renders its own not-found page on any non-2xx.

---

## Categories

### `GET /api/categories/`

No query params. Response: `Category[]` — **not** paginated (the frontend calls this expecting a plain array, matching a small, fixed category count).

```ts
interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
}
```

### `GET /api/categories/{slug}/`

Response: single `Category`. **404** if slug doesn't exist.

---

## Blog

### `GET /api/blog/`

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `search` | string | matches against title + excerpt |
| `tag` | string | matches any entry in `tags[]` |
| `category` | `"محصول" \| "طراحی" \| "آموزش" \| "سبک زندگی" \| "جامعه"` | exact match |
| `page` | number | |
| `pageSize` | number | default 12 |

Results are sorted by `publishedAt` descending by default. Response: `PaginatedResponse<BlogPost>`

```ts
type BlogCategory = "محصول" | "طراحی" | "آموزش" | "سبک زندگی" | "جامعه";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  sections: BlogSection[]; // ordered; each becomes an <h2 id> + a sticky-TOC anchor
  coverImage: string;
  author: string;
  authorRole: string;
  publishedAt: string;     // ISO date
  tags: string[];
  readingTime: number;     // minutes, integer
}

interface BlogSection {
  id: string;      // used as the URL fragment / TOC anchor, e.g. "s1"
  heading: string; // rendered as <h2>
  body: string;    // plain text/paragraph, no HTML expected
}
```

### `GET /api/blog/{slug}/`

Response: single `BlogPost`. **404** if slug doesn't exist.

---

## Site settings

A single object, not a list — company contact info, hours, social links, trust/payment badges. Currently sourced from `src/data/siteSettings.ts`; every value here is **content the client will hand over**, not something the frontend or design team authors.

### `GET /api/settings/`

No params. Response: single `SiteSettings` object (no pagination envelope).

```ts
interface SiteSettings {
  phone: { display: string; href: string }; // display: "021 1234 5678", href: "+982112345678" (for tel:)
  email: string;
  address: string;
  businessHours: BusinessHoursRow[];
  socialLinks: SocialLink[];
  trustBadgeLabel: string;      // e.g. "نماد اعتماد" — becomes an image/link once the real badge exists
  paymentGatewayLabel: string;  // e.g. "درگاه پرداخت" — same
}

interface BusinessHoursRow {
  day: string;   // e.g. "شنبه تا چهارشنبه"
  time: string;  // e.g. "9:00 — 18:00" or "تعطیل"
}

interface SocialLink {
  platform: string; // "INSTAGRAM", "TELEGRAM", etc. — rendered as-is, no mapping to icons yet
  url: string;
}
```

Consumed by both the global footer (every page) and the contact page's info panel — same query key (`site-settings`) client-side, fetched once and cached for the session.

---

## Catalog

A single downloadable-PDF record, not a list of products. Currently sourced from `src/data/catalog.ts`.

### `GET /api/catalog/`

No params. Response: single `CatalogFile` object.

```ts
interface CatalogFile {
  title: string;
  description: string;
  format: string;        // "PDF"
  fileUrl: string;        // absolute or root-relative download URL
  fileSizeMb: number;
  pageCount: number;
  updatedAt: string;      // ISO date
  edition: string;        // e.g. "1404/02"
  coverImage: string;
  spreads: CatalogSpread[];   // preview thumbnails shown in a lightbox
  editions: CatalogEdition[]; // archive of previous editions, newest first
}

interface CatalogSpread {
  id: string;
  image: string;
  caption: string;
}

interface CatalogEdition {
  label: string;      // e.g. "۱۴۰۴/۰۲"
  isCurrent: boolean;  // exactly one entry should be true
  pageCount: number;
  fileSizeMb: number;
  fileUrl: string;
}
```

---

## Contact form

### `POST /api/contact/`

Request body:

```ts
interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;      // one of the fixed options below, but the backend
                         // should not hard-reject unknown values — the
                         // frontend <select> is the enforcement point
  message: string;
  newsletter?: boolean;
}
```

Current subject options shown in the `<select>` (static content, editable without a backend change): `"سؤال درباره محصول"`, `"پیگیری سفارش"`, `"ایراد یا مرجوعی"`, `"سفارش عمده"`, `"همکاری"`.

Frontend-side validation (zod, runs before the request is ever sent):
- `name`: required (non-empty after trim)
- `email`: required, must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- `subject`: required (non-empty)
- `message`: required, minimum 10 characters after trim
- `newsletter`: boolean, defaults to `false`

The backend should still validate independently (never trust client-only validation) and return field-level errors on failure — see error shape below.

Success response (any 2xx): `ContactMessage`

```ts
interface ContactMessage {
  id: string;            // used to render "شماره پیگیری {id}" — should be a
                          // short, human-readable tracking code, not a UUID
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  newsletter?: boolean;
  submittedAt: string;   // ISO datetime
}
```

Error response: any non-2xx status causes the frontend to show a generic "پیام ارسال نشد" retry state — **the submitted form values are preserved client-side** so the user doesn't lose their message on failure, no special error body parsing happens yet. If field-level error detail becomes available later, this is the integration point to extend.

---

## Things explicitly out of scope for this contract

- **Product data itself** (names, descriptions, prices, images, dimensions) — the current 24 fake products stay as placeholder content until a separate content-authoring pass with the client.
- **Cart / checkout / auth** — the header shows static `CART`/`ACCOUNT` buttons with no behavior; not part of this phase.
- **Newsletter subscription** (footer form) — currently a local-only success state (`setSubscribed(true)`), no endpoint wired.
- **Search** (`/search` route) — page exists as a stub, not built out yet.
