# Admin API Contract — VYBE Admin Panel ↔ Backend

Parallel document to [`API-CONTRACT.md`](./API-CONTRACT.md), same rigor. This is what the admin panel (`/admin`, phases A1–A3) is built against — once the real endpoints exist (phase B6), wiring the panel is a body-swap in its `api.ts`, same rule as the storefront: **no component should need to change** if this contract is honored.

All models referenced here are already implemented in `backend/apps/*/models.py` (phase A0).

## Conventions

- Base path: **`/api/admin/`** — entirely separate from the public `/api/` surface.
- **Auth:** JWT (`djangorestframework-simplejwt`). Every endpoint below requires `Authorization: Bearer <access>` **and** `request.user.is_staff == True`. Non-staff (or unauthenticated) → `403 { "detail": "..." }`.
- **camelCase** in/out, same as the public contract.
- Prices: integer Toman. Dates: ISO 8601.
- **Admin detail routes use numeric `id`, not `slug`** — unlike the public API, staff need direct row addressing, not SEO-friendly URLs.
- Every list endpoint uses the same pagination envelope as `API-CONTRACT.md`:
  ```ts
  interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }
  ```
- Every table endpoint supports `page`, `pageSize`, `ordering` (`-` prefix = descending), and the filters listed per-section, all via query string — no client-side pagination/filtering.
- Validation errors: DRF default shape, `{ [field]: string[] }`, `400`. Not-found: `404 { "detail": "..." }`. Every destructive action (delete, bulk edit, status transition) can fail with a specific `400 { "detail": "..." }` describing why (e.g. an invalid order-status transition raises the same message as the model's `InvalidOrderTransition`).

---

## Auth

### `POST /api/admin/auth/login/`

Request: `{ phone: string; password: string }`
Response `200`: `{ access: string; refresh: string; user: { id, phone, firstName, lastName, isStaff, isSuperuser, mustChangePassword } }`
`401` if credentials invalid or user is not staff.

`mustChangePassword: true` means a superuser reset this account's password (see [Password & account management](#password--account-management-بخش-۷۶) below) — the frontend force-redirects to a change-password screen before anything else in the panel is reachable.

### `POST /api/admin/auth/refresh/`

Request: `{ refresh: string }` → Response: `{ access: string }`

### `POST /api/admin/auth/change-password/` — see [Password & account management](#password--account-management-بخش-۷۶)

---

## 1. Dashboard (بخش ۱)

Five zones per BACKEND-TASK.md §6 — "needs action" first, charts last. Every number in `needsAction` and `systemHealth` is meant to be a link on the frontend to that zone's already-existing filtered list (e.g. `paidPendingProcessing` → `/orders?status=paid`); the backend only returns counts, the admin panel owns the routes.

### `GET /api/admin/dashboard/`

```ts
interface DashboardSummary {
  needsAction: {
    paidPendingProcessing: number;   // Order.status="paid"
    readyToShip: number;             // Order.status="processing"
    newReturnRequests: number;       // Return.status="requested"
    unreadMessages: number;
    pendingReviews: number;
    lowStockCount: number;           // StockAlert.isTriggered
    outOfStockActive: number;        // stockCount=0 AND isActive — visible but unbuyable
    stalePendingPayments: number;    // status="pending" older than 30 minutes
  };
  today: {
    sales: number; salesLastWeekSameDay: number;
    orders: number; ordersLastWeekSameDay: number;
    averageOrderValue: number; averageOrderValueLastWeekSameDay: number;
    conversionRate: number; conversionRateLastWeekSameDay: number; // cartsCreated vs ordersPaid, today only
  };
  siteVisits: {
    today: { pageViews: number; uniqueVisitors: number };
    thisMonth: { pageViews: number; uniqueVisitors: number };
    total: { pageViews: number; uniqueVisitors: number }; // always from DailyStat, never a live PageView count
    topPages: { path: string; views: number }[];          // last 14 days
    topReferrers: { referrer: string; views: number }[];  // last 14 days
    worstViewToPurchase: { product: Product; views: number; purchases: number; ratio: number }[]; // lowest ratio first
  };
  trends: {
    salesChart30d: { date: string; total: number }[];
    topProductsByQuantity: { product: Product; unitsSold: number; revenue: number }[]; // this week, top 5
    topProductsByRevenue: { product: Product; unitsSold: number; revenue: number }[];  // this week, top 5
    thisMonthToDate: number;
    lastMonthToDate: number; // same day-of-month cutoff as thisMonthToDate
  };
  sinceLastVisit: {
    lastVisitAt: string | null; // User.lastDashboardVisit
    feed: {
      type: "order" | "user" | "review" | "message" | "return" | "activity";
      id: string; summary: string; createdAt: string;
      link: { path: string; id: string } | null; // null only for "activity" rows
    }[]; // newest first, capped at 30
  };
  systemHealth: {
    kavenegarCredit: number | null;         // null if no active credential or the API call failed
    kavenegarThresholdBreached: boolean;    // credit < 10000
    gateways: { service: string; label: string; isActive: boolean; hasValidCredentials: boolean }[];
    paymentErrors24h: number;
    stockDiscrepancies: { product: Product; stockCount: number; ledgerBalance: number }[]; // top 10
    sitemapLastReadAt: string | null;
    sitemapDiscoveredUrls: number;
    paidNotShippedOverThreshold: number; // status in (paid, processing) and paidAt older than 3 days
  };
  recentOrders: Order[]; // last 10, same shape as §6
}
```

### `POST /api/admin/dashboard/mark-seen/`

Sets the calling admin's `lastDashboardVisit` to now. Returns `{ lastDashboardVisit: string }`. Call this from the "mark all as seen" button, never automatically on `GET` — otherwise the feed would clear itself before the admin reads it.

---

## 2. Products (بخش ۲)

### `GET /api/admin/products/`

Filters: `category` (id), `search` (name/sku), `isActive`, `productionStatus`, `inStock` (`stockCount>0` vs `=0`), `ordering` (`price`, `-price`, `stockCount`, `-stockCount`, `order`).

### `GET/PATCH/DELETE /api/admin/products/{id}/`

### `POST /api/admin/products/`

```ts
interface AdminProduct {
  id: number;
  sku: string; slug: string; name: string;
  shortDescription: string; description: string;
  price: number; costPrice: number | null;
  category: number; // category id
  images: ProductImage[]; colors: ColorOption[];
  material: string; dimensions: { w: number; h: number; d: number };
  weight: number; layerHeight: number;
  stockCount: number;    // read-only — never accept writes here, see §13
  inStock: boolean;      // read-only, derived
  order: number; isActive: boolean;
  shippingTime: string; returnPolicy: string;
  productionStatus: "in_stock" | "made_to_order" | "discontinued";
  metaTitle: string; metaDescription: string;
  specs: { label: string; value: string; unit?: string }[]; // EAV, read-only here — edit via §5
  createdAt: string; updatedAt: string;
}
interface ProductImage { id: number; image: string; alt: string; order: number; }
interface ColorOption { id: number; name: string; hex: string; inStock: boolean; order: number; }
```

`stockCount` is **read-only on every product endpoint** — it can only change via a `StockMovement` (§13). Any `stockCount` key in a `POST`/`PATCH` body is ignored.

### `POST /api/admin/products/{id}/images/` (multipart: `image`, `alt`, `order`) → `ProductImage`
### `DELETE /api/admin/products/{id}/images/{imageId}/`
### `POST/PATCH/DELETE /api/admin/products/{id}/colors/` / `.../colors/{colorId}/`

### `GET /api/admin/products/price-list.pdf`

Same filters as `GET /api/admin/products/` (BACKEND-TASK.md §3.6-ب). SKU/name/category/price table, straight from the database so it's never stale — for sending to wholesale customers or printing. `Content-Disposition: attachment`.

---

## 3. Price bulk edit (بخش ۳)

### `GET /api/admin/products/prices/`

Paginated `{ id, name, sku, category, price }[]`, filterable by `category`.

### `POST /api/admin/products/prices/bulk/?preview=true|false`

```ts
interface BulkPriceEditInput {
  productIds: number[];
  mode: "percent" | "fixed" | "set";
  direction?: "increase" | "decrease"; // required for percent/fixed, ignored for set
  value: number;
  roundToNearest1000?: boolean;
  reason?: string;
}
```

With `?preview=true`: computes and returns the diff **without writing anything**:
`{ changes: { productId, name, oldPrice, newPrice }[] }`

Without `preview` (or `preview=false`): applies in one DB transaction, writes one `PriceHistory` row per changed product (`oldPrice`, `newPrice`, `changedBy`, `reason`), and returns the same `{ changes: [...] }` shape.

### `GET /api/admin/products/{id}/price-history/`

Paginated `{ id, oldPrice, newPrice, changedBy: string, reason: string, createdAt }[]`.

---

## 4. Categories (بخش ۴)

### `GET/POST /api/admin/categories/`, `GET/PATCH/DELETE /api/admin/categories/{id}/`

```ts
interface AdminCategory {
  id: number; slug: string; name: string; description: string; image: string | null;
  parent: number | null; order: number; isActive: boolean;
}
```

`parent` pointing at a category that itself has a `parent` → `400 { "detail": "دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد." }` (mirrors `Category.clean()`).

---

## 5. Product specs / EAV (بخش ۵)

### `GET /api/admin/attributes/?category={id}`

Returns only `Attribute`s linked (via M2M) to that category — this is what powers the "select a category → see only its spec fields" form behavior.

```ts
interface Attribute {
  id: number; name: string; slug: string; unit: string;
  inputType: "select" | "text" | "number" | "boolean";
  categories: number[]; isRequired: boolean; order: number;
}
```

### `POST/PATCH/DELETE /api/admin/attributes/{id}/`

### `GET /api/admin/attributes/{id}/values/` → `{ id, value, order }[]`
### `POST /api/admin/attributes/{id}/values/` `{ value: string }` → creates an `AttributeValue` — this is the "promote a custom value to a reusable dropdown entry" action.

### `PUT /api/admin/products/{id}/specs/`

Request: `{ attributeId: number; valueOptionId?: number; valueText?: string }[]` — replaces **all** `ProductAttribute` rows for the product in one call (delete-then-recreate, in a transaction). Exactly one of `valueOptionId`/`valueText` per entry; `400` if both or neither given (mirrors `ProductAttribute.clean()`).

Response: the same array shape as request, each entry echoing back its resolved `id`.

---

## 6. Orders (بخش ۶)

### `GET /api/admin/orders/`

Filters: `status`, `user` (id), `dateFrom`, `dateTo`, `search` (order number).

### `GET /api/admin/orders/{id}/`

```ts
interface Order {
  id: number; number: string; user: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "canceled" | "returned";
  shippingAddress: { title, province, city, line, postalCode, receiverName, receiverPhone };
  subtotal: number; discount: number; shippingCost: number; tax: number; total: number;
  coupon: number | null; note: string; trackingCode: string;
  items: { id, product: number | null, productName, sku, price, colorName, quantity, subtotal }[];
  payments: { id, gateway, amount, status, refId, createdAt, verifiedAt }[];
  statusLogs: { fromStatus, toStatus, note, user: string | null, createdAt }[];
  createdAt: string; updatedAt: string; paidAt: string | null; shippedAt: string | null;
}
```

### Status-transition actions (each POSTs with no body except where noted, returns the updated `Order` or `400 { "detail": "..." }` on an invalid transition — same message as the model's `InvalidOrderTransition`):

- `POST /api/admin/orders/{id}/mark-paid/`
- `POST /api/admin/orders/{id}/start-processing/` — this is also what triggers the `sale` `StockMovement` for every item (see §13).
- `POST /api/admin/orders/{id}/mark-shipped/` — body: `{ trackingCode: string }`
- `POST /api/admin/orders/{id}/mark-delivered/`
- `POST /api/admin/orders/{id}/cancel/` — body: `{ reason?: string }`. If the order was `processing`, this also reverses stock via a `return_in` `StockMovement` per item.

No endpoint ever accepts a raw `status` field — only these action routes, exactly mirroring the model: **no direct field writes**.

### PDF exports (BACKEND-TASK.md §3.6-ب — HTML→PDF via headless Chromium, never ReportLab/FPDF)

- `GET /api/admin/orders/{id}/invoice.pdf` → same document and same on-order cache as the customer-facing `GET /api/orders/{number}/invoice.pdf` (`API-CONTRACT.md`); `400` if the order isn't `paid` or later.
- `GET /api/admin/orders/{id}/packing-slip.pdf` → no prices, printed and dropped inside the box while packing.
- `GET /api/admin/orders/daily-shipping-list.pdf?date=YYYY-MM-DD` (defaults to today) → every `processing` order that became ready to ship that day, with a blank tracking-code column filled in by hand at the post office counter.

All three: `Content-Type: application/pdf`, `Content-Disposition: attachment`.

---

## 7. Search Console (بخش ۷)

Read-only. Backed by a once-daily Celery task, never a live Google API call per request.

- `GET /api/admin/search-console/performance/?from&to` → `{ impressions, clicks, ctr, avgPosition, series: { date, impressions, clicks, ctr, avgPosition }[] }`
- `GET /api/admin/search-console/queries/?from&to` → top search queries: `{ query, impressions, clicks, ctr, position }[]`
- `GET /api/admin/search-console/pages/?from&to` → top pages: `{ page, impressions, clicks, ctr, position }[]`
- `GET /api/admin/search-console/index-status/` → `{ indexedCount, errorCount, issues: { page, reason }[] }`
- `GET /api/admin/search-console/sitemap-status/` → `{ lastReadAt: string | null, discoveredUrls: number }`

`503 { "detail": "..." }` if the daily cache hasn't run yet (e.g. credentials not configured).

---

## 8. Inventory — current state (بخش ۸)

Distinct from the ledger (§13): this is a snapshot, not history.

### `GET /api/admin/inventory/`

Paginated `{ product: { id, name, sku }, stockCount, reorderPoint, isLow, stockValue }[]` (`stockValue = stockCount * costPrice`, `null` if `costPrice` unset). Filters: `isLow=true`, `category`.

### `GET /api/admin/inventory/summary/` → `{ totalStockValue: number | null, lowStockCount: number }`

### `PATCH /api/admin/inventory/{productId}/alert/` → `{ reorderPoint: number; isActive: boolean }` (upserts the product's `StockAlert`)

### `GET /api/admin/inventory/stocktake.pdf`

Same filters as `GET /api/admin/inventory/` (BACKEND-TASK.md §3.6-ب). SKU/name/category/system-stock table with two blank columns (manual count, discrepancy) for a physical warehouse count. `Content-Disposition: attachment`.

---

## 9. Users (بخش ۹)

### `GET /api/admin/users/`

Filters: `search` (phone/name), `isVerified`.

### `GET /api/admin/users/{id}/`

```ts
interface AdminUser {
  id: number; phone: string; firstName: string; lastName: string; email: string | null;
  isVerified: boolean; isActive: boolean; isStaff: boolean; createdAt: string;
  role: string | null; roleName: string | null; // AdminRole id/name — null for non-staff or staff with no role assigned
  addresses: { id, title, province, city, line, postalCode, receiverName, receiverPhone, isDefault }[];
  orderCount: number;
}
```

### `POST /api/admin/users/`

```ts
interface AdminCreateUserInput {
  phone: string; firstName?: string; lastName?: string; email?: string;
  isVerified?: boolean; // staff-created users can be set verified directly, bypassing OTP entirely
  isStaff?: boolean; roleId?: string; // roleId required when isStaff is true
}
```

### `PATCH /api/admin/users/{id}/`

Same shape as create, all fields optional. Changing `roleId` on your own account is blocked (`403`, superuser exempt) — see [role self-escalation guardrails](#roles-crud-section-roles). Demoting/deactivating/de-staffing the last remaining مدیر کل or superuser is blocked with `400`.

### Password & account management for a specific user — see [§7.6 below](#password--account-management-بخش-۷۶)

- `POST /api/admin/users/{id}/reset-password/`
- `POST /api/admin/users/{id}/impersonate/`
- `POST /api/admin/users/{id}/force-logout/`

### `GET /api/admin/users/{id}/addresses/`

### `GET /api/admin/users/{id}/statement.pdf`

Purchase history for one customer — every order (any status), plus a paid-orders-only total spent (BACKEND-TASK.md §3.6-ب: "برای خریداران تکراری و عمده"). `Content-Disposition: attachment`.

---

## 10. Messages (بخش ۱۰)

### `GET /api/admin/messages/`

Filters: `isRead`, `subject`.

```ts
interface AdminContactMessage {
  id: number; name: string; email: string; phone: string; subject: string; message: string;
  newsletter: boolean; isRead: boolean; adminNote: string; ipAddress: string | null; submittedAt: string;
}
```

### `GET /api/admin/messages/{id}/`, `PATCH /api/admin/messages/{id}/` → `{ isRead?: boolean; adminNote?: string }`

---

## 11. Sales management / reports (بخش ۱۱)

All accept `from`, `to` (ISO dates). All amounts in Toman.

- `GET /api/admin/reports/sales/?groupBy=day|week|month` → `{ series: { period, total, orderCount }[], averageOrderValue: number }`
- `GET /api/admin/reports/top-products/?by=quantity|revenue` → `{ product, unitsSold, revenue }[]`
- `GET /api/admin/reports/by-category/` → `{ category, total, orderCount }[]`
- `GET /api/admin/reports/conversion/` → `{ cartsCreated: number; ordersPaid: number; rate: number }`
- `GET /api/admin/reports/abandoned-carts/` → `{ cartsCreated: number; cartsAbandoned: number; rate: number }`
- `GET /api/admin/reports/customers/` → `{ newCustomers: number; returningCustomers: number }`
- `GET /api/admin/reports/by-gateway/` → `{ gateway, total, orderCount }[]`
- `GET /api/admin/reports/return-rate/` → `{ ordersDelivered: number; ordersReturned: number; rate: number }`
- `GET /api/admin/reports/gross-margin/` → `{ revenue, cost, margin, coveragePercent }` — `coveragePercent` is the share of sold units that had `costPrice` set; excluded units are noted, never silently guessed.
- `GET /api/admin/reports/sales/export/?format=xlsx` → binary `.xlsx` download (`Content-Disposition: attachment`), same filters as `/reports/sales/`.
- `GET /api/admin/reports/sales/export.pdf` → for the accountant: sales/discount/shipping/tax totals plus a gateway breakdown, over `from`/`to` (BACKEND-TASK.md §3.6-ب). Rendered via Celery, not inline — see §13's stock-ledger PDF for why. `Content-Disposition: attachment`.

---

## 12. Settings (بخش ۱۲)

### `GET/PATCH /api/admin/settings/site/`

Singleton — `PATCH` accepts a partial multipart body (for the image fields). Full shape:

```ts
interface AdminSiteSettings {
  businessName: string; economicCode: string; nationalId: string; // seller identity for invoice PDFs (§3.6-الف), shown nowhere on the storefront
  phoneDisplay: string; phoneHref: string; email: string; address: string;
  businessHours: { day: string; time: string }[];
  instagramUrl: string; telegramUrl: string; whatsappUrl: string;
  linkedinUrl: string; youtubeUrl: string; pinterestUrl: string;
  googleMapsEmbed: string; latitude: number | null; longitude: number | null;
  trustBadgeLabel: string; trustBadgeImage: string | null; trustBadgeUrl: string;
  paymentGatewayLabel: string;
  logoLight: string | null; logoDark: string | null; favicon: string | null; defaultOgImage: string | null;
  googleAnalyticsId: string; googleTagManagerId: string;
}
```

### `GET/POST /api/admin/settings/credentials/`, `GET/PATCH/DELETE /api/admin/settings/credentials/{id}/`

```ts
interface ApiCredential {
  id: number; service: "kavenegar" | "zarinpal" | "idpay" | "snapppay" | "digipay";
  label: string; isActive: boolean; isSandbox: boolean; order: number;
  // `credentials` is write-only: accepted on POST/PATCH as a JSON object,
  // NEVER returned in any response body (masked). This is a hard rule — see §0(د).
}
```

`isActive: false` → that gateway must not appear in the storefront checkout gateway list (enforced server-side in phase B5, not just hidden client-side).

### `GET/POST /api/admin/settings/shipping-methods/`, `PATCH/DELETE .../{id}/`

```ts
interface ShippingMethod { id: number; name: string; cost: number; freeAbove: number | null; estimatedDays: string; isActive: boolean; order: number; }
```

---

## 13. Stock ledger / کاردکس (بخش ۱۳)

### `GET /api/admin/stock-movements/`

Filters: `product`, `type`, `dateFrom`, `dateTo`. Sorted `-createdAt` by default.

```ts
interface StockMovement {
  id: number; product: number; type: "purchase" | "production" | "sale" | "return_in" | "adjustment" | "scrap";
  quantity: number; // signed
  balanceAfter: number; reference: string; note: string; user: string | null; createdAt: string;
}
```

### `POST /api/admin/stock-movements/`

```ts
interface CreateStockMovementInput { productId: number; type: "purchase" | "production" | "adjustment" | "scrap"; quantity: number; note?: string; }
```

`type: "sale"`/`"return_in"` are **rejected here (400)** — those are only ever created by the order state machine (§6), never manually. Server-side this calls `StockMovement.objects.record(...)`; a quantity that would drive stock negative → `400 { "detail": "موجودی نمی‌تواند منفی شود." }`.

### `GET /api/admin/stock-movements/export/?...&format=xlsx` → binary `.xlsx`, same filters as the list.

### `GET /api/admin/stock-movements/export.pdf?...` → same filters as the list. Per product: opening balance, total in, total out, closing balance, then the movement rows — a warehouse audit document (BACKEND-TASK.md §3.6-ب). Rendered through a Celery task (`apps.documents.tasks.render_pdf_async`), not inline in the request, since an unfiltered multi-product range can be large enough to time out a web worker.

---

## 14. Reviews (بخش ۱۴)

### `GET /api/admin/reviews/`

Filters: `status`, `product`.

```ts
interface AdminProductReview {
  id: number; product: number; user: string | null; rating: number; title: string; body: string;
  status: "pending" | "approved" | "rejected"; adminReply: string; verifiedPurchase: boolean; createdAt: string;
}
```

### `PATCH /api/admin/reviews/{id}/` → `{ status?: "approved" | "rejected"; adminReply?: string }`

Only `approved` reviews are ever included in the public product-detail average/distribution (public API concern, not this contract — noted here for context).

---

## Bonus sections (not in the original 14, added per §8 of `BACKEND-TASK.md`)

### Blog management

- `GET/POST /api/admin/blog/`, `GET/PATCH/DELETE /api/admin/blog/{id}/`
  ```ts
  interface AdminBlogPost {
    id: number; slug: string; title: string; excerpt: string; category: string;
    sections: { id: string; heading: string; body: string }[];
    coverImage: string | null; resolvedCoverUrl: string; author: string; authorRole: string; tags: string[];
    readingTime: number; isPublished: boolean; metaTitle: string; metaDescription: string;
    publishedAt: string | null;
  }
  ```

  `coverImage` is a writable `ImageField` (multipart upload); `resolvedCoverUrl` is read-only and falls back to the seed data's `externalCoverUrl` when no file has been uploaded yet — the panel previews `resolvedCoverUrl`, uploads write `coverImage`.

### Coupons

- `GET/POST /api/admin/coupons/`, `GET/PATCH/DELETE /api/admin/coupons/{id}/`
  ```ts
  interface AdminCoupon {
    id: number; code: string; type: "percent" | "fixed"; value: number;
    minOrderValue: number; maxDiscount: number | null;
    usageLimit: number | null; usedCount: number; perUserLimit: number | null;
    startsAt: string | null; endsAt: string | null;
    categories: number[]; products: number[]; isActive: boolean;
  }
  ```

### Returns

- `GET /api/admin/returns/`, `GET /api/admin/returns/{id}/` — filter: `status` (`requested` | `approved` | `received` | `refunded` | `rejected`)
- `POST /api/admin/returns/{id}/approve/`, `.../reject/`, `.../mark-received/`, `.../mark-refunded/` — same "action route, never a raw status field" pattern as orders (§6). `mark-refunded` also settles the associated `Payment`/refund flow once phase B5 exists.

### Admin activity log

- `GET /api/admin/activity-log/` — filters `user`, `model`, `dateFrom`, `dateTo`. Read-only, paginated, written automatically by every mutating admin endpoint above (not user-triggerable).
  ```ts
  interface AdminActivityLogEntry { id: number; user: string | null; action: string; modelName: string; objectId: string; changes: Record<string, [unknown, unknown]> | null; createdAt: string; }
  ```

---

## Permission model

Every route in this document requires `is_staff = true` at minimum. On top of that, each view is gated by a **section + action** permission (`require_section("<section>", action="<action>")` in `apps/admin_api/permissions.py`) — built on Django's own `Group`/`Permission` tables, not a parallel system. `action` defaults from the HTTP method (`GET`→`view`, `POST`→`create`, `PUT`/`PATCH`→`edit`, `DELETE`→`delete`) and falls back to `edit` then `view` if the resolved action doesn't exist for that section (e.g. a mixed GET+POST view on a section with no `create` action). **`request.user.is_superuser` always bypasses every section check.**

Sections (20 total) and the actions each one actually has — not every section has all four:

| Section key | Label | Actions |
|---|---|---|
| `products` | محصولات | view, create, edit, delete |
| `categories` | دسته‌بندی‌ها | view, create, edit, delete |
| `specs` | مشخصات محصولات | view, create, edit, delete |
| `pricing` | اصلاح قیمت | view, edit |
| `cost_price` | قیمت تمام‌شده محصول | view |
| `orders` | سفارشات | view, edit |
| `inventory` | موجودی | view, edit |
| `stock_ledger` | کاردکس | view, create |
| `returns` | مرجوعی‌ها | view, edit |
| `messages` | پیام‌ها | view, edit |
| `reviews` | نظرات | view, edit |
| `blog` | بلاگ | view, create, edit, delete |
| `coupons` | کدهای تخفیف | view, create, edit, delete |
| `reports` | گزارش‌های فروش و سود | view |
| `settings` | تنظیمات سایت | view, edit |
| `credentials` | کلیدهای API | view, create, edit, delete |
| `users` | کاربران | view, create, edit |
| `roles` | مدیریت نقش‌ها و دسترسی | view, edit |
| `activity_log` | لاگ فعالیت | view |
| `search_console` | سرچ کنسول | view |

`credentials`, `reports`, `cost_price`, `pricing`, `roles`, `activity_log` are **sensitive sections** — never pre-checked when a new role is created via the UI (enforcement is server-side convention in the roles UI, not a hard backend block on granting them). Dashboard has no section — every staff member sees it, its zone counts already reflect the underlying sections' own gating.

`AdminProductSerializer` and the inventory serializers additionally strip `cost_price` / `stock_value` / `total_stock_value` from the response body for users without `cost_price:view`, even though the surrounding endpoint's own section (`products`, `inventory`) may still be viewable — a field-level check layered on top of the endpoint-level one.

### Default roles

Seeded by a data migration (`apps/admin_api/migrations/0003_default_roles.py`), `is_system = true` (can't be deleted; renaming/re-granting is otherwise unrestricted like any role):

| Role | Grants |
|---|---|
| مدیر کل | every section, every action it has |
| مدیر محصول | products, categories, specs, blog (full CRUD) + reviews (view, edit) |
| مدیر سفارشات | orders, inventory, stock_ledger, returns, messages (view/edit per their available actions) |
| پشتیبانی | orders (view), users (view), messages (view, edit) |
| حسابدار | reports (view) only |

### `GET /api/admin/me/permissions/`

Any authenticated staff user (not gated by a section — this endpoint answers "what am I allowed"). Response:
```ts
interface MyPermissions { isSuperuser: boolean; grants: Record<string, string[]> } // grants: { [sectionKey]: actionKey[] }
```
Frontend uses this to hide nav items/buttons the server would reject anyway — **UX only, not a security boundary**; every endpoint still checks server-side regardless of what the frontend shows.

### Roles CRUD (section: `roles`)

- `GET /api/admin/roles/` — list, no pagination. `AdminRole { id: string; name: string; description: string; isSystem: boolean; grants: Record<string, string[]> }`
- `POST /api/admin/roles/` — `{ name, description?, grants: Record<string, string[]> }` → `201` with the created role. `400` if `name` empty/duplicate, or `grants` references an unknown section/action.
- `GET /api/admin/roles/{id}/` — single role.
- `PATCH /api/admin/roles/{id}/` — same body shape as create, all fields optional; omitted `grants` leaves existing grants untouched. `403` if you try to edit the role your own account is a member of (superuser exempt).
- `DELETE /api/admin/roles/{id}/` — `400` if `isSystem`; `403` if it's your own role (superuser exempt). `204` on success.
- `GET /api/admin/roles/sections/` — static catalog the checkbox-matrix UI renders from: `Array<{ key: string; label: string; actions: string[]; sensitive: boolean }>`.

**Guardrails enforced server-side, not just hidden in the UI:** a user can never edit or delete the role their own account belongs to, and demoting/deactivating/de-staffing the last remaining مدیر کل-group-member (or last superuser) is blocked with `400` — both exempt for superusers.

---

## Password & account management (بخش ۷.۶)

All three endpoints below are **superuser-only** (`IsSuperuser`, stricter than any section grant — a role with a `users:edit` grant still can't touch another staff member's password), and every action is written to the activity log. There is deliberately **no "view password" capability** — passwords are hashed and never recoverable, only replaceable.

### `POST /api/admin/users/{id}/reset-password/`

Staff targets only (`400` if the target isn't `is_staff`). Generates a random 14-character password, sets it, flags `must_change_password = true` on the target, and returns the new password **exactly once** — never stored or logged in plain text anywhere, including the activity log entry itself.
Response `200`: `{ password: string }`

The target's next successful login response carries `user.mustChangePassword: true`; the admin frontend force-redirects to a change-password screen (outside the normal sidebar layout) until `POST /api/admin/auth/change-password/` clears the flag — even the freshly-issued temp password must be re-entered as `current_password` there, so an already-open stale session can't silently re-lock the account.

### `POST /api/admin/users/{id}/impersonate/`

Non-staff targets only (`400` if the target is `is_staff` — this is for reproducing a **customer's** reported issue, not for one staff member to act as another). **Never returns a real JWT.** Issues a short-lived, single-use `ImpersonationTicket` instead:
```ts
interface ImpersonateTicketResponse {
  ticket: string;
  expiresInSeconds: number; // 60 — the ticket itself, not the session
  url: string; // `${FRONTEND_BASE_URL}/impersonate?ticket=...`, ready to hand to the agent
}
```

A bearer token in a URL survives browser history, server access logs, and the `Referer` header — this ticket does too, but it's worthless the instant it's redeemed or a moment later, whichever comes first, so that's an acceptable place for it to travel. The admin frontend renders `url` as a direct link (`ImpersonateResultModal.tsx`), not a copy-token block.

The storefront's own `/impersonate?ticket=...` route is the only thing that ever redeems the ticket, via `POST /api/auth/impersonate/consume/` (public — see `API-CONTRACT.md`), which is where the real, restricted session token is minted and where the "support session started" `AdminActivityLog` entry (`action: "impersonate_start"`) is actually written — not at ticket-issue time, since a ticket the admin requests but never uses shouldn't read as a session that happened. That session token: carries an `impersonated: true` claim, has no refresh token (dies at its own 30-minute expiry, cannot be renewed), and is rejected by every `admin_api` endpoint outright (`is_staff` check) — it can only ever be used against the public storefront API, and even there `IsNotImpersonating` blocks checkout and address deletion (see `API-CONTRACT.md`'s "Support-mode" section for the exact restriction list). Ending the session (`POST /api/auth/impersonate/end/`, also public) writes a matching `action: "impersonate_end"` entry.

### `POST /api/admin/users/{id}/force-logout/`

Blacklists every `OutstandingToken` belonging to the target user (via `rest_framework_simplejwt.token_blacklist`, installed as a real Django app — every `RefreshToken.for_user()` call automatically creates an `OutstandingToken` row, no extra wiring needed).
Response `200`: `{ tokensRevoked: number }`

**Known, accepted limitation:** this revokes the ability to mint new access tokens via refresh; any access token already issued and not yet expired remains valid until its own natural expiry (≤30 minutes in this project's JWT settings). This matches the spec's literal wording ("ابطال refresh token"), not a stronger "kill every live request this instant" guarantee.

### `POST /api/admin/auth/change-password/`

Self-service, any authenticated staff user, not superuser-gated — this is also how a user clears `must_change_password` after a superuser reset. `{ current_password: string; new_password: string }` → `400` on wrong current password or a new password under 8 characters; `200 { detail: string }` on success.
