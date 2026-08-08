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
  specs: ProductSpec[];     // additive — dynamic per-category fields, see below
}

interface ProductSpec {
  label: string;   // Attribute.name, e.g. "رنگ سطح"
  value: string;
  unit?: string;    // Attribute.unit, e.g. "mm" — omitted when the attribute has none
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

**`specs` is additive, not a replacement.** `material`, `dimensions`, `weight`, `layerHeight` stay fixed top-level fields — they have dedicated UI treatment on the product page. `specs` carries whatever dynamic, per-category attributes the backend's EAV system (`Attribute`/`AttributeValue`/`ProductAttribute`) attaches to a given product (e.g. a "کیف پول" product might have a `specs` entry for `{label: "تعداد جیب", value: "3"}` that a "پایه گوشی" product wouldn't have). Render it as a plain label/value list below the fixed spec block; an empty array is valid and renders nothing extra.

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

## Auth (phone + OTP)

No password login — phone number is the identity, a 6-digit OTP is the credential. JWT (access + refresh) issued on successful verification.

### `POST /api/auth/otp/request/`

Request: `{ phone: string }` — Iranian mobile format `09xxxxxxxxx`.

Response `200`: `{ expiresInSeconds: number }` (currently `120`).
Response `429`: `{ detail: string }` — rate-limited at 3 requests / 10 minutes / phone. The frontend should disable the submit button and show the returned message; do not retry automatically.

### `POST /api/auth/otp/verify/`

Request: `{ phone: string; code: string; cartSessionKey?: string }` — pass the guest cart's session key (see Cart below) to merge it into the user's cart as part of logging in; omit it if there's no guest cart to merge.

Response `200`:
```ts
interface OtpVerifyResponse {
  access: string;
  refresh: string;
  user: { id: string; phone: string; firstName: string; lastName: string; email: string | null; isVerified: boolean; createdAt: string };
  isNewUser: boolean; // true if this call created the account — use it to route to a "complete your profile" step vs. straight to /account
}
```
Response `400`: `{ detail: string }` — wrong or expired code, or the max-5-attempts guard tripped. Same generic message either way; do not reveal which.

A code is single-use — verifying successfully consumes it immediately, a replay of the same code fails.

### `POST /api/auth/refresh/`

Request: `{ refresh: string }` → Response: `{ access: string }`. Call this when a request 401s with an expired access token; if refresh itself fails, send the user back through OTP login.

### `GET /api/auth/me/`, `PATCH /api/auth/me/`

Requires `Authorization: Bearer <access>`. `GET` returns the same `user` shape as above. `PATCH` accepts a partial `{ firstName?, lastName?, email? }` — `phone` and `isVerified` are read-only here.

`401` for missing/invalid/expired token on any authenticated endpoint in this contract.

---

## Addresses

All endpoints below require `Authorization: Bearer <access>` and are implicitly scoped to the logged-in user — there is no way to address another user's rows (a mismatched id returns `404`, not `403`, to avoid confirming it exists).

### `GET /api/addresses/`

Not paginated — a user's address count is always small. Response: `Address[]`, sorted default-first then newest-first.

```ts
interface Address {
  id: string;
  title: string;          // e.g. "خانه", "محل کار" — optional label
  province: string;
  city: string;
  line: string;           // street address
  postalCode: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
  createdAt: string;
}
```

### `POST /api/addresses/`

Request: `Address` minus `id`/`createdAt`. Setting `isDefault: true` automatically unsets it on every other address the user owns — at most one default at a time, enforced server-side, not something the frontend needs to manage.

### `GET/PATCH/DELETE /api/addresses/{id}/`

Standard CRUD, same ownership scoping. `404` if the id doesn't belong to the caller.

---

## Cart

A cart is either **guest** (identified by a client-generated session key, no login required) or **owned by a logged-in user** — never both. There is no separate "merge" endpoint: send the guest session key as `cartSessionKey` in the `POST /api/auth/otp/verify/` body (see Auth above) and the backend merges it into the user's cart as part of logging in.

**Identifying a guest cart:** send header `X-Cart-Session: <key>` on every cart request. If you don't have one yet, omit the header — the first response includes a new key in the `X-Cart-Session` **response** header; store it (e.g. `localStorage`) and send it on every subsequent request. Once the user is authenticated, stop sending this header entirely — `Authorization: Bearer <access>` alone identifies their cart.

```ts
interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;   // sum of quantities
  subtotal: number;    // sum of price × quantity, computed from live Product prices, not stored
}

interface CartItem {
  id: string;
  product: { id: string; slug: string; name: string; sku: string; price: number; image: string | null; inStock: boolean; stockCount: number };
  colorOption: { id: string; name: string; hex: string; inStock: boolean } | null;
  quantity: number;
  lineTotal: number;   // product.price × quantity
}
```

### `GET /api/cart/`

Response: `Cart` (empty `items: []` if nothing's been added yet — there's no 404 for "no cart", one is created lazily).

### `POST /api/cart/items/`

Request: `{ productId: string; colorOptionId?: string; quantity?: number }` (`quantity` defaults to 1). **No price field — the server always reads the live `Product.price`.** Adding a product/color combo that's already in the cart increases its quantity instead of creating a duplicate line. Response: the full updated `Cart`, status `201`.

### `PATCH /api/cart/items/{id}/`

Request: `{ quantity: number }`. Response: full updated `Cart`.

### `DELETE /api/cart/items/{id}/`

Response: full updated `Cart`.

---

## Favorites

Favorites are **per-user only** — there is no guest favorite row on the server. Guests keep their picks in `localStorage` (a plain array of product IDs) and every endpoint here requires `Authorization: Bearer <access>`. On login, POST the locally-saved IDs to `merge/` once; after that, clear `localStorage` and use these endpoints normally.

Every endpoint below (including `POST`/`DELETE`) returns the user's **full, updated favorites list as an array of `Product`** (same shape as `GET /api/products/{slug}/`), most-recently-favorited first — not just the changed row — so the frontend can `setQueryData` directly without a second request.

### `GET /api/favorites/`

Response: `Product[]`.

### `POST /api/favorites/`

Request: `{ productId: string }`. Adding a product that's already favorited is a no-op (idempotent), not an error. `404` if the product doesn't exist. Response: `Product[]`, status `201`.

### `DELETE /api/favorites/{productId}/`

Removing a product that was never favorited is a no-op, not an error. Response: `Product[]`.

### `POST /api/favorites/merge/`

Request: `{ productIds: string[] }`. Bulk-adds every ID that exists and isn't already favorited; unknown IDs are silently skipped, existing favorites are left untouched (never duplicated). Response: `Product[]`.

---

## Shipping methods

### `GET /api/shipping-methods/`

No params, not paginated (method count is always small), active methods only.

```ts
interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  freeAbove: number | null;  // subtotal threshold for free shipping, or null if none
  estimatedDays: string;
}
```

---

## Checkout

### `POST /api/checkout/`

Requires `Authorization: Bearer <access>` — checkout always requires a logged-in user (the cart itself works for guests, but placing an order does not). Converts the caller's current cart into a `pending` Order and empties the cart. **Never deducts stock** — that only happens once a payment gateway confirms the order `paid` (see Payments below); a checkout-created order can still be canceled for free.

Request:
```ts
interface CheckoutInput {
  addressId: string;         // must be one of the caller's own saved addresses
  shippingMethodId: string;
  couponCode?: string;
  note?: string;
}
```

Response `201`: an `Order` (see below).
Response `400`: field-keyed errors, e.g. `{ "addressId": "آدرس یافت نشد." }`, `{ "couponCode": "..." }`, or `{ "cart": "سبد خرید خالی است." }`/`"موجودی «...» کافی نیست."` for stock/availability problems. Same shape as every other validation error in this contract — no special-casing needed client-side.

Total calculation (all server-side, all four components always present even when zero):
```
subtotal  = Σ (live product price × quantity)
discount  = coupon-dependent (see below); 0 if no coupon
shipping  = shippingMethod.cost, or 0 if subtotal ≥ shippingMethod.freeAbove
tax       = 0 (no tax-rate configuration exists yet — field is reserved for when one does)
total     = subtotal − discount + shipping + tax
```

A coupon scoped to specific products/categories only discounts the subtotal of matching cart lines, not the whole cart; an unscoped coupon discounts everything. `min_order_value` is checked against the full cart subtotal regardless of scoping.

---

## Orders (history)

Both endpoints require `Authorization: Bearer <access>` and are scoped to the caller — a mismatched order number is `404`, same non-disclosure rule as addresses.

### `GET /api/orders/`

Paginated, newest first.

```ts
interface OrderSummary {
  id: string;
  number: string;              // e.g. "VYBE-260608-A1B2C3"
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "canceled" | "returned";
  total: number;
  itemCount: number;
  createdAt: string;
  paidAt: string | null;
}
```

### `GET /api/orders/{number}/`

```ts
interface Order extends OrderSummary {
  shippingAddress: { title: string; province: string; city: string; line: string; postalCode: string; receiverName: string; receiverPhone: string };
  subtotal: number; discount: number; shippingCost: number; tax: number;
  note: string;
  trackingCode: string;
  items: { id: string; productName: string; sku: string; price: number; colorName: string; quantity: number; subtotal: number }[];
  payments: { id: string; gateway: string; amount: number; refId: string; status: "pending" | "success" | "failed"; createdAt: string; verifiedAt: string | null }[];
  statusLogs: { fromStatus: string; toStatus: string; note: string; user: string | null; createdAt: string }[];
  shippedAt: string | null;
}
```

`payments` is `[]` until a payment attempt exists for the order (one row is created the moment `POST /api/orders/{number}/pay/` succeeds, regardless of whether it's ever verified). `items`/`statusLogs` snapshot exactly what happened at the time — they don't change if the underlying product is later edited or deleted.

`gateway` on a `Payment` is always one of `"ZARINPAL" | "IDPAY" | "SNAPPPAY" | "DIGIPAY"` — the same codes as `PaymentGateway.code` below. `gatewayName` is a **snapshot** taken when the payment was created, not a live lookup — an order paid through a gateway that's since been disabled (or renamed) still shows the name it showed on the day it was paid.

---

## Payments

### `GET /api/payment-gateways/`

No auth, not paginated. Returns only gateways an admin has turned on **and** that have usable credentials configured — a gateway with `isActive=true` but empty/broken credentials never appears here. **The frontend never hardcodes this list**; it can be empty, have one entry, or up to four.

```ts
interface PaymentGateway {
  code: "ZARINPAL" | "IDPAY" | "SNAPPPAY" | "DIGIPAY";
  name: string;           // "زرین‌پال"
  logo: string | null;
  description: string | null;  // e.g. "پرداخت اعتباری" for SnapPay
  order: number;
}
```

Checkout UI must handle three cases, not just "the happy path with 4 gateways":
- **0 gateways** — payment step is a dead end, not a broken form: show "پرداخت آنلاین موقتاً در دسترس نیست" and a way to contact support; the submit button stays disabled.
- **1 gateway** — no picker. It's auto-selected and shown as plain info, not a radio button with one option.
- **2–4 gateways** — a picker, nothing pre-selected, submitting without a choice is its own validation error (not a generic "form incomplete").

### `POST /api/orders/{number}/pay/`

Requires `Authorization: Bearer <access>`, scoped to the caller's own order (`404` otherwise). Starts a payment attempt against a `pending` order and returns a URL to redirect the browser to.

Request: `{ gatewayCode: "ZARINPAL" | "IDPAY" | "SNAPPPAY" | "DIGIPAY" }`

Response `201`: `{ redirectUrl: string }` — `window.location.href = redirectUrl` sends the user to the bank/gateway.
Response `400`: `{ "gatewayCode": "..." }` if the order isn't `pending`, the gateway code isn't currently offered, or the gateway itself rejected the request. **This re-validates the gateway server-side at this exact moment** — a gateway the user saw in the picker two minutes ago that an admin has since disabled fails here with a specific error, not a generic 500; the frontend should re-fetch `GET /api/payment-gateways/` and ask the user to pick again.

### `GET|POST /api/payments/callback/{gatewayCode}/{token}/`

**Never called by the frontend directly.** The gateway itself redirects (or POSTs) the user's browser here after they finish at the bank. The server verifies the transaction with the gateway server-side, and only on a verified success does the order become `paid` — returning from the gateway is never itself sufficient. This callback is idempotent: a duplicate/retried call for an already-verified payment is a no-op, not a second stock deduction.

Always responds `302`, redirecting into the SPA: `{FRONTEND_URL}/checkout/callback?order={number}&status=success|failed`. The frontend route at `/checkout/callback` reads these two query params to render the outcome — it does not need to poll or re-verify anything itself.

---

## Analytics (internal, fire-and-forget)

### `POST /api/analytics/pageview/`

No auth required, no meaningful response body (`204`). The frontend calls this once per route change; it must never block navigation or surface an error to the user — a failed call is silently ignored client-side.

Request: `{ path: string; referrer?: string; productSlug?: string }`. The server reads the real IP/User-Agent from the request itself (never trusts a client-supplied value) and only ever stores a one-way, daily-salted hash of them — no raw IP, no cookie. `/api/*`, `/admin/`, and static-asset paths are never recorded even if sent.

---

## Things explicitly out of scope for this contract

- **Product data itself** (names, descriptions, prices, images, dimensions) — the current 24 fake products stay as placeholder content until a separate content-authoring pass with the client.
- **Payment gateways** — checkout creates a `pending` order; actually paying for it (`GET /api/payment-gateways/`, redirect, callback, `verify`) is phase B5. `13-checkout.html` isn't converted to React until that lands.
- **Newsletter subscription** (footer form) — currently a local-only success state (`setSubscribed(true)`), no endpoint wired.
- **Search** (`/search` route) — page exists as a stub, not built out yet.
- **Invoice PDF** (`GET /api/orders/{orderNumber}/invoice.pdf`) — documented in `BACKEND-TASK.md` §3.6, lands with the PDF-export phase, not this one. The account page's "دانلود فاکتور" button exists but stays disabled until then.
