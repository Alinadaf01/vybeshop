import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { blogPosts } from "@/data/blog";
import { siteSettings } from "@/data/siteSettings";
import { catalog } from "@/data/catalog";
import { loadStoredAuth, saveStoredAuth, clearStoredAuth } from "@/lib/authStorage";
import { getCartSessionKey, setCartSessionKey } from "@/lib/cartSession";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { BlogPost, BlogCategory } from "@/types/blog";
import type { ContactMessage, ContactMessageInput } from "@/types/contact";
import type { PaginatedResponse } from "@/types/api";
import type { SiteSettings } from "@/data/siteSettings";
import type { CatalogFile } from "@/data/catalog";
import type { AuthUser, ImpersonateConsumeResponse, OtpVerifyResponse } from "@/types/auth";
import type { Address, AddressInput } from "@/types/address";
import type { Cart } from "@/types/cart";
import type { Order, OrderSummary, PaymentGatewayCode } from "@/types/order";
import type { PaymentGateway } from "@/types/payment";
import type { ShippingMethod } from "@/types/shipping";
import type { HomepageContent } from "@/types/homepage";

const NETWORK_DELAY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS));
}

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const results = items.slice(start, start + pageSize);
  const hasNext = start + pageSize < items.length;
  const hasPrevious = page > 1;
  return {
    count: items.length,
    next: hasNext ? `page=${page + 1}` : null,
    previous: hasPrevious ? `page=${page - 1}` : null,
    results,
  };
}

// The real backend base URL, e.g. "https://api.vybeshop.ir/api" or
// "http://localhost:8000/api" for local Django dev. When unset, every
// function below skips the network entirely and serves fake data — this
// keeps the deployed storefront working before the backend exists, and
// keeps every function falling back to fake data if the backend goes down.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

class ApiUnavailableError extends Error {}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!API_BASE_URL) throw new ApiUnavailableError("VITE_API_BASE_URL is not configured");
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch (cause) {
    throw new ApiUnavailableError("Backend unreachable", { cause });
  }
}

/** Runs `attempt`; falls back to `fallback` only when the backend itself is
 * unreachable (unconfigured / network failure) — a real error response from
 * a reachable backend (404, 400, 500, ...) is never masked by fake data. */
async function withFallback<T>(attempt: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (error instanceof ApiUnavailableError) return fallback();
    throw error;
  }
}

export type ProductOrdering = "price" | "-price" | "name" | "-name";

export interface GetProductsParams {
  category?: string;
  search?: string;
  ordering?: ProductOrdering;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
}

async function getProductsFallback(
  params: GetProductsParams,
): Promise<PaginatedResponse<Product>> {
  let items = [...products];

  if (params.category) {
    items = items.filter((product) => product.category === params.category);
  }

  if (params.search) {
    const query = params.search.trim().toLowerCase();
    items = items.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query),
    );
  }

  if (typeof params.minPrice === "number") {
    items = items.filter((product) => product.price >= params.minPrice!);
  }

  if (typeof params.maxPrice === "number") {
    items = items.filter((product) => product.price <= params.maxPrice!);
  }

  if (params.inStock) {
    items = items.filter((product) => product.inStock);
  }

  if (params.ordering) {
    const direction = params.ordering.startsWith("-") ? -1 : 1;
    const key = params.ordering.replace("-", "") as "price" | "name";
    items.sort((a, b) => {
      if (key === "price") return (a.price - b.price) * direction;
      return a.name.localeCompare(b.name) * direction;
    });
  }

  return delay(paginate(items, params.page, params.pageSize));
}

export async function getProducts(
  params: GetProductsParams = {},
): Promise<PaginatedResponse<Product>> {
  return withFallback(
    async () => {
      const query = new URLSearchParams();
      if (params.category) query.set("category", params.category);
      if (params.search) query.set("search", params.search);
      if (params.ordering) query.set("ordering", params.ordering);
      if (typeof params.minPrice === "number") query.set("minPrice", String(params.minPrice));
      if (typeof params.maxPrice === "number") query.set("maxPrice", String(params.maxPrice));
      if (params.inStock) query.set("inStock", "true");
      if (params.page) query.set("page", String(params.page));
      if (params.pageSize) query.set("pageSize", String(params.pageSize));

      const res = await apiFetch(`/products/?${query.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
      return (await res.json()) as PaginatedResponse<Product>;
    },
    () => getProductsFallback(params),
  );
}

export async function getProduct(slug: string): Promise<Product> {
  return withFallback(
    async () => {
      const res = await apiFetch(`/products/${encodeURIComponent(slug)}/`);
      if (!res.ok) throw new Error(`Failed to fetch product ${slug}: ${res.status}`);
      return (await res.json()) as Product;
    },
    async () => {
      const product = products.find((item) => item.slug === slug);
      if (!product) throw new Error(`Product not found: ${slug}`);
      return delay(product);
    },
  );
}

export async function getCategories(): Promise<Category[]> {
  return withFallback(
    async () => {
      const res = await apiFetch("/categories/");
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
      return (await res.json()) as Category[];
    },
    () => delay([...categories]),
  );
}

export async function getCategory(slug: string): Promise<Category> {
  return withFallback(
    async () => {
      const res = await apiFetch(`/categories/${encodeURIComponent(slug)}/`);
      if (!res.ok) throw new Error(`Failed to fetch category ${slug}: ${res.status}`);
      return (await res.json()) as Category;
    },
    async () => {
      const category = categories.find((item) => item.slug === slug);
      if (!category) throw new Error(`Category not found: ${slug}`);
      return delay(category);
    },
  );
}

export interface GetBlogPostsParams {
  search?: string;
  tag?: string;
  category?: BlogCategory;
  page?: number;
  pageSize?: number;
}

async function getBlogPostsFallback(
  params: GetBlogPostsParams,
): Promise<PaginatedResponse<BlogPost>> {
  let items = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  if (params.search) {
    const query = params.search.trim().toLowerCase();
    items = items.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query),
    );
  }

  if (params.tag) {
    items = items.filter((post) => post.tags.includes(params.tag!));
  }

  if (params.category) {
    items = items.filter((post) => post.category === params.category);
  }

  return delay(paginate(items, params.page, params.pageSize));
}

export async function getBlogPosts(
  params: GetBlogPostsParams = {},
): Promise<PaginatedResponse<BlogPost>> {
  return withFallback(
    async () => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.tag) query.set("tag", params.tag);
      if (params.category) query.set("category", params.category);
      if (params.page) query.set("page", String(params.page));
      if (params.pageSize) query.set("pageSize", String(params.pageSize));

      const res = await apiFetch(`/blog/?${query.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch blog posts: ${res.status}`);
      return (await res.json()) as PaginatedResponse<BlogPost>;
    },
    () => getBlogPostsFallback(params),
  );
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  return withFallback(
    async () => {
      const res = await apiFetch(`/blog/${encodeURIComponent(slug)}/`);
      if (!res.ok) throw new Error(`Failed to fetch blog post ${slug}: ${res.status}`);
      return (await res.json()) as BlogPost;
    },
    async () => {
      const post = blogPosts.find((item) => item.slug === slug);
      if (!post) throw new Error(`Blog post not found: ${slug}`);
      return delay(post);
    },
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return withFallback(
    async () => {
      const res = await apiFetch("/settings/");
      if (!res.ok) throw new Error(`Failed to fetch site settings: ${res.status}`);
      return (await res.json()) as SiteSettings;
    },
    () => delay(siteSettings),
  );
}

export async function getCatalog(): Promise<CatalogFile> {
  return withFallback(
    async () => {
      const res = await apiFetch("/catalog/");
      if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status}`);
      return (await res.json()) as CatalogFile;
    },
    () => delay(catalog),
  );
}

/** Unlike every other getX() above, this never throws and never falls back
 * to fake data — HOMEPAGE-ADMIN-TASK.md §5's critical rule is that the home
 * page must fall back to src/content/home.ts's static defaults on ANY
 * failure (unreachable backend, 404/500, malformed JSON), not just when the
 * backend is unconfigured. Returning null is the signal HomePage.tsx reads
 * to mean "render the static page exactly as it looked before this
 * feature existed." */
export async function getHomepage(): Promise<HomepageContent | null> {
  try {
    const res = await apiFetch("/homepage/");
    if (!res.ok) return null;
    return (await res.json()) as HomepageContent;
  } catch {
    return null;
  }
}

export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<ContactMessage> {
  return withFallback(
    async () => {
      const res = await apiFetch("/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Failed to submit contact message: ${res.status}`);
      return (await res.json()) as ContactMessage;
    },
    async () => {
      const message: ContactMessage = {
        ...input,
        id: `msg-${Date.now()}`,
        submittedAt: new Date().toISOString(),
      };
      return delay(message);
    },
  );
}

// Auth (phone + OTP) and addresses have no meaningful fake-data fallback —
// faking a logged-in session would be actively misleading, not a demo
// convenience. These always hit the real backend and surface a real error
// (in Persian) when it's unreachable, instead of silently degrading.

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return (body && typeof body === "object" && "detail" in body && typeof body.detail === "string")
    ? body.detail
    : fallback;
}

export async function requestOtp(phone: string): Promise<{ expiresInSeconds: number }> {
  let res: Response;
  try {
    res = await apiFetch("/auth/otp/request/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
  } catch {
    throw new Error("ارسال کد ممکن نشد. اتصال اینترنت را بررسی کنید.");
  }
  if (!res.ok) throw new Error(await readErrorDetail(res, "ارسال کد ناموفق بود."));
  return res.json();
}

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResponse> {
  let res: Response;
  try {
    res = await apiFetch("/auth/otp/verify/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The guest cart session key (if any) merges into the user's cart as
      // part of logging in — no separate "merge my cart" call needed.
      body: JSON.stringify({ phone, code, cartSessionKey: getCartSessionKey() ?? undefined }),
    });
  } catch {
    throw new Error("تأیید کد ممکن نشد. اتصال اینترنت را بررسی کنید.");
  }
  if (!res.ok) throw new Error(await readErrorDetail(res, "کد وارد‌شده اشتباه یا منقضی است."));
  return res.json();
}

/** Exchanges a short-lived, single-use admin-issued ticket (see /impersonate)
 * for a real, restricted support session. No fake-data fallback — there's no
 * sensible offline behavior for this, it should just fail clearly. */
export async function consumeImpersonationTicket(ticket: string): Promise<ImpersonateConsumeResponse> {
  let res: Response;
  try {
    res = await apiFetch("/auth/impersonate/consume/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    });
  } catch {
    throw new Error("اتصال به سرور ممکن نشد.");
  }
  if (!res.ok) throw new Error(await readErrorDetail(res, "بلیط نامعتبر یا منقضی‌شده است."));
  return res.json();
}

export async function endImpersonationSession(): Promise<void> {
  const res = await authorizedFetch("/auth/impersonate/end/", { method: "POST" });
  if (!res.ok) throw new Error("پایان‌دادن به نشست پشتیبانی ناموفق بود.");
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await apiFetch("/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = (await res.json()) as { access: string };
  return data.access;
}

/** Attaches the current access token; on a 401 it refreshes once via the
 * stored refresh token and retries, and clears the session if that fails too. */
async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadStoredAuth();
  if (!stored) throw new Error("ابتدا وارد حساب کاربری شوید.");

  const doFetch = (accessToken: string) =>
    apiFetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${accessToken}` },
    });

  let response = await doFetch(stored.tokens.access);
  if (response.status === 401) {
    try {
      const access = await refreshAccessToken(stored.tokens.refresh);
      saveStoredAuth({ tokens: { access, refresh: stored.tokens.refresh }, user: stored.user });
      response = await doFetch(access);
    } catch {
      clearStoredAuth();
      throw new Error("نشست شما منقضی شده است. دوباره وارد شوید.");
    }
  }
  return response;
}

export async function getMe(): Promise<AuthUser> {
  const res = await authorizedFetch("/auth/me/");
  if (!res.ok) throw new Error("دریافت اطلاعات حساب ناموفق بود.");
  return res.json();
}

export async function updateMe(
  input: Partial<Pick<AuthUser, "firstName" | "lastName" | "email">>,
): Promise<AuthUser> {
  const res = await authorizedFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await readErrorDetail(res, "ذخیره تغییرات ناموفق بود."));
  return res.json();
}

export async function getAddresses(): Promise<Address[]> {
  const res = await authorizedFetch("/addresses/");
  if (!res.ok) throw new Error("دریافت آدرس‌ها ناموفق بود.");
  return res.json();
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const res = await authorizedFetch("/addresses/", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await readErrorDetail(res, "ذخیره آدرس ناموفق بود."));
  return res.json();
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const res = await authorizedFetch(`/addresses/${id}/`, { method: "PATCH", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await readErrorDetail(res, "ذخیره آدرس ناموفق بود."));
  return res.json();
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await authorizedFetch(`/addresses/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("حذف آدرس ناموفق بود.");
}

// Favorites — per-user only, same reasoning as auth/addresses: no fake-data
// fallback. Guests keep their picks in localStorage (see favoritesStorage.ts)
// and never call these; every function here requires a logged-in user.

export async function getFavorites(): Promise<Product[]> {
  const res = await authorizedFetch("/favorites/");
  if (!res.ok) throw new Error("دریافت علاقه‌مندی‌ها ناموفق بود.");
  return res.json();
}

export async function addFavorite(productId: string): Promise<Product[]> {
  const res = await authorizedFetch("/favorites/", { method: "POST", body: JSON.stringify({ productId }) });
  if (!res.ok) throw new Error("افزودن به علاقه‌مندی‌ها ناموفق بود.");
  return res.json();
}

export async function removeFavorite(productId: string): Promise<Product[]> {
  const res = await authorizedFetch(`/favorites/${productId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("حذف از علاقه‌مندی‌ها ناموفق بود.");
  return res.json();
}

export async function mergeFavorites(productIds: string[]): Promise<Product[]> {
  const res = await authorizedFetch("/favorites/merge/", { method: "POST", body: JSON.stringify({ productIds }) });
  if (!res.ok) throw new Error("ادغام علاقه‌مندی‌ها ناموفق بود.");
  return res.json();
}

// Fire-and-forget — must never throw or slow down navigation. No-ops when
// no backend is configured (matches every other function's fallback story,
// except here there's simply nothing to record instead of fake data).
export function reportPageView(path: string, productSlug?: string): void {
  if (!API_BASE_URL) return;
  fetch(`${API_BASE_URL}/analytics/pageview/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer: document.referrer, productSlug }),
  }).catch(() => undefined);
}

// Cart — works for both guests (X-Cart-Session header, no login required)
// and logged-in users (Authorization header). No fake-data fallback, same
// reasoning as auth/addresses: a fake cart would be actively misleading.

async function cartFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadStoredAuth();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (stored) {
    headers.Authorization = `Bearer ${stored.tokens.access}`;
  } else {
    const sessionKey = getCartSessionKey();
    if (sessionKey) headers["X-Cart-Session"] = sessionKey;
  }

  const res = await apiFetch(path, { ...init, headers });
  const newSessionKey = res.headers.get("X-Cart-Session");
  if (newSessionKey) setCartSessionKey(newSessionKey);
  return res;
}

export async function getCart(): Promise<Cart> {
  const res = await cartFetch("/cart/");
  if (!res.ok) throw new Error("دریافت سبد خرید ناموفق بود.");
  return res.json();
}

export async function addCartItem(input: {
  productId: string;
  colorOptionId?: string;
  quantity?: number;
}): Promise<Cart> {
  const res = await cartFetch("/cart/items/", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await readErrorDetail(res, "افزودن به سبد ناموفق بود."));
  return res.json();
}

export async function updateCartItem(id: string, quantity: number): Promise<Cart> {
  const res = await cartFetch(`/cart/items/${id}/`, { method: "PATCH", body: JSON.stringify({ quantity }) });
  if (!res.ok) throw new Error("به‌روزرسانی سبد ناموفق بود.");
  return res.json();
}

export async function removeCartItem(id: string): Promise<Cart> {
  const res = await cartFetch(`/cart/items/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("حذف از سبد ناموفق بود.");
  return res.json();
}

export async function getOrders(): Promise<PaginatedResponse<OrderSummary>> {
  const res = await authorizedFetch("/orders/");
  if (!res.ok) throw new Error("دریافت سفارش‌ها ناموفق بود.");
  return res.json();
}

export async function getOrder(number: string): Promise<Order> {
  const res = await authorizedFetch(`/orders/${encodeURIComponent(number)}/`);
  if (!res.ok) throw new Error("دریافت سفارش ناموفق بود.");
  return res.json();
}

// Checkout errors are field-keyed (e.g. { addressId: "..." }, { cart: "..." })
// so the form can point at the exact step that failed, not just show a
// generic banner — readErrorDetail's single "detail" string isn't enough here.
export class ApiFieldError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

async function readFieldError(response: Response, fallback: string): Promise<ApiFieldError> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    const [field, message] = Object.entries(body)[0] ?? [];
    if (field && typeof message === "string") return new ApiFieldError(field, message);
  }
  return new ApiFieldError("detail", fallback);
}

export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const res = await apiFetch("/shipping-methods/");
  if (!res.ok) throw new Error("دریافت روش‌های ارسال ناموفق بود.");
  return res.json();
}

export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  const res = await apiFetch("/payment-gateways/");
  if (!res.ok) throw new Error("دریافت درگاه‌های پرداخت ناموفق بود.");
  return res.json();
}

export interface CheckoutInput {
  addressId: string;
  shippingMethodId: string;
  couponCode?: string;
  note?: string;
}

export async function checkout(input: CheckoutInput): Promise<Order> {
  const res = await authorizedFetch("/checkout/", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) throw await readFieldError(res, "ثبت سفارش ناموفق بود.");
  return res.json();
}

export async function initiatePayment(
  orderNumber: string,
  gatewayCode: PaymentGatewayCode,
): Promise<{ redirectUrl: string }> {
  const res = await authorizedFetch(`/orders/${encodeURIComponent(orderNumber)}/pay/`, {
    method: "POST",
    body: JSON.stringify({ gatewayCode }),
  });
  if (!res.ok) throw await readFieldError(res, "شروع پرداخت ناموفق بود.");
  return res.json();
}
