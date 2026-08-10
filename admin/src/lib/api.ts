import { loadStoredAdminAuth, saveStoredAdminAuth, clearStoredAdminAuth } from "@/lib/adminAuthStorage";
import type { AdminLoginResponse } from "@/types/adminAuth";
import type { PaginatedResponse } from "@/types/api";
import type { AdminCategory, CategoryFormValues } from "@/types/category";
import type { Attribute, AttributeFormValues, AttributeValue } from "@/types/attribute";
import type { AdminProduct, ColorOption, ProductFormValues, ProductImage, ProductSpecEntry, ProductSpecRow } from "@/types/product";
import type { AdminOrder } from "@/types/order";

// No fake-data phase here, unlike the storefront's src/lib/api.ts — B6's
// real /api/admin/ endpoints already exist, so every function below always
// hits the real backend. Base URL always resolves to something (falls back
// to same-origin /api/admin) rather than throwing, since this app has no
// fallback-to-fixtures story to guard against an unconfigured backend.
const API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "/api/admin";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
    ? body.detail
    : fallback;
}

// Validation errors use DRF's default { [field]: string[] } shape (see
// ADMIN-API-CONTRACT.md Conventions) — surfaced once A2's forms need it.
export class ApiFieldError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

export async function readFieldError(response: Response, fallback: string): Promise<ApiFieldError> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    const [field, messages] = Object.entries(body)[0] ?? [];
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (field && typeof message === "string") return new ApiFieldError(field, message);
  }
  return new ApiFieldError("detail", fallback);
}

export async function adminLogin(phone: string, password: string): Promise<AdminLoginResponse> {
  let res: Response;
  try {
    res = await apiFetch("/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
  } catch {
    throw new Error("ورود ممکن نشد. اتصال اینترنت را بررسی کنید.");
  }
  if (!res.ok) throw new Error(await readErrorDetail(res, "شماره یا رمز عبور اشتباه است."));
  return res.json();
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

/** Attaches the current access token; on 401 refreshes once via the stored
 * refresh token and retries, clearing the session if that also fails.
 * Every future admin page's data fetch (A2+) goes through this. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadStoredAdminAuth();
  if (!stored) throw new Error("ابتدا وارد پنل شوید.");

  // FormData bodies (image uploads) must NOT get an explicit Content-Type —
  // the browser sets multipart/form-data with the correct boundary itself.
  const isFormData = init.body instanceof FormData;
  const doFetch = (accessToken: string) =>
    apiFetch(path, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let response = await doFetch(stored.tokens.access);
  if (response.status === 401) {
    try {
      const access = await refreshAccessToken(stored.tokens.refresh);
      saveStoredAdminAuth({ tokens: { access, refresh: stored.tokens.refresh }, user: stored.user });
      response = await doFetch(access);
    } catch {
      clearStoredAdminAuth();
      throw new Error("نشست شما منقضی شده است. دوباره وارد شوید.");
    }
  }
  return response;
}

function buildQuery(params: object): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === "") continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function buildFormData(fields: object, file?: File | null, fileKey = "image"): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (value === null) {
      form.append(key, "");
      continue;
    }
    if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
      continue;
    }
    form.append(key, String(value));
  }
  if (file) form.append(fileKey, file);
  return form;
}

async function parseOrThrow<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw await readFieldError(response, fallback);
  return response.json() as Promise<T>;
}

async function throwIfError(response: Response, fallback: string): Promise<void> {
  if (!response.ok) throw new Error(await readErrorDetail(response, fallback));
}

// ---------------------------------------------------------------------------
// Categories (§4)
// ---------------------------------------------------------------------------

export async function listCategories(
  params: { page?: number; pageSize?: number; parent?: number | "null" } = {},
): Promise<PaginatedResponse<AdminCategory>> {
  const res = await authorizedFetch(`/categories/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت دسته‌بندی‌ها ناموفق بود.");
}

export async function createCategory(data: CategoryFormValues, imageFile?: File | null): Promise<AdminCategory> {
  const init: RequestInit = imageFile
    ? { method: "POST", body: buildFormData(data, imageFile) }
    : { method: "POST", body: JSON.stringify(data) };
  const res = await authorizedFetch("/categories/", init);
  return parseOrThrow(res, "ایجاد دسته‌بندی ناموفق بود.");
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryFormValues>,
  imageFile?: File | null,
): Promise<AdminCategory> {
  const init: RequestInit = imageFile
    ? { method: "PATCH", body: buildFormData(data, imageFile) }
    : { method: "PATCH", body: JSON.stringify(data) };
  const res = await authorizedFetch(`/categories/${id}/`, init);
  return parseOrThrow(res, "ویرایش دسته‌بندی ناموفق بود.");
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await authorizedFetch(`/categories/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف دسته‌بندی ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Attributes / EAV (§5)
// ---------------------------------------------------------------------------

export async function listAttributes(categoryId?: number): Promise<Attribute[]> {
  const res = await authorizedFetch(`/attributes/${buildQuery({ category: categoryId })}`);
  return parseOrThrow(res, "دریافت مشخصات ناموفق بود.");
}

export async function createAttribute(data: AttributeFormValues): Promise<Attribute> {
  const res = await authorizedFetch("/attributes/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "ایجاد مشخصه ناموفق بود.");
}

export async function updateAttribute(id: string, data: Partial<AttributeFormValues>): Promise<Attribute> {
  const res = await authorizedFetch(`/attributes/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش مشخصه ناموفق بود.");
}

export async function deleteAttribute(id: string): Promise<void> {
  const res = await authorizedFetch(`/attributes/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف مشخصه ناموفق بود.");
}

export async function listAttributeValues(attributeId: string): Promise<AttributeValue[]> {
  const res = await authorizedFetch(`/attributes/${attributeId}/values/`);
  return parseOrThrow(res, "دریافت مقادیر ناموفق بود.");
}

export async function createAttributeValue(attributeId: string, value: string): Promise<AttributeValue> {
  const res = await authorizedFetch(`/attributes/${attributeId}/values/`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
  return parseOrThrow(res, "افزودن مقدار ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Products (§2, §5 specs, images, colors)
// ---------------------------------------------------------------------------

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  isActive?: string;
  productionStatus?: string;
  ordering?: string;
}

export async function listProducts(params: ProductListParams): Promise<PaginatedResponse<AdminProduct>> {
  const res = await authorizedFetch(`/products/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت محصولات ناموفق بود.");
}

export async function getProduct(id: string): Promise<AdminProduct> {
  const res = await authorizedFetch(`/products/${id}/`);
  return parseOrThrow(res, "دریافت محصول ناموفق بود.");
}

export async function createProduct(data: ProductFormValues): Promise<AdminProduct> {
  const res = await authorizedFetch("/products/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "ایجاد محصول ناموفق بود.");
}

export async function updateProduct(id: string, data: Partial<ProductFormValues>): Promise<AdminProduct> {
  const res = await authorizedFetch(`/products/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش محصول ناموفق بود.");
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await authorizedFetch(`/products/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف محصول ناموفق بود.");
}

export async function uploadProductImage(productId: string, file: File, order: number, alt = ""): Promise<ProductImage> {
  const res = await authorizedFetch(`/products/${productId}/images/`, {
    method: "POST",
    body: buildFormData({ alt, order }, file),
  });
  return parseOrThrow(res, "آپلود تصویر ناموفق بود.");
}

export async function patchProductImage(
  productId: string,
  imageId: string,
  patch: { order?: number; alt?: string },
): Promise<ProductImage> {
  const res = await authorizedFetch(`/products/${productId}/images/${imageId}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return parseOrThrow(res, "ویرایش تصویر ناموفق بود.");
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  const res = await authorizedFetch(`/products/${productId}/images/${imageId}/`, { method: "DELETE" });
  await throwIfError(res, "حذف تصویر ناموفق بود.");
}

export async function createColor(
  productId: string,
  data: { name: string; hex: string; inStock?: boolean; order?: number },
): Promise<ColorOption> {
  const res = await authorizedFetch(`/products/${productId}/colors/`, { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "افزودن رنگ ناموفق بود.");
}

export async function updateColor(
  productId: string,
  colorId: string,
  patch: Partial<{ name: string; hex: string; inStock: boolean; order: number }>,
): Promise<ColorOption> {
  const res = await authorizedFetch(`/products/${productId}/colors/${colorId}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return parseOrThrow(res, "ویرایش رنگ ناموفق بود.");
}

export async function deleteColor(productId: string, colorId: string): Promise<void> {
  const res = await authorizedFetch(`/products/${productId}/colors/${colorId}/`, { method: "DELETE" });
  await throwIfError(res, "حذف رنگ ناموفق بود.");
}

export async function getProductSpecs(productId: string): Promise<ProductSpecRow[]> {
  const res = await authorizedFetch(`/products/${productId}/specs/`);
  return parseOrThrow(res, "دریافت مشخصات ناموفق بود.");
}

export async function putProductSpecs(productId: string, entries: ProductSpecEntry[]): Promise<ProductSpecRow[]> {
  const res = await authorizedFetch(`/products/${productId}/specs/`, { method: "PUT", body: JSON.stringify(entries) });
  return parseOrThrow(res, "ذخیره مشخصات ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Orders (§6)
// ---------------------------------------------------------------------------

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function listOrders(params: OrderListParams): Promise<PaginatedResponse<AdminOrder>> {
  const res = await authorizedFetch(`/orders/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت سفارش‌ها ناموفق بود.");
}

export async function getOrder(id: string): Promise<AdminOrder> {
  const res = await authorizedFetch(`/orders/${id}/`);
  return parseOrThrow(res, "دریافت سفارش ناموفق بود.");
}

async function orderAction(id: string, action: string, body?: Record<string, unknown>): Promise<AdminOrder> {
  const res = await authorizedFetch(`/orders/${id}/${action}/`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readErrorDetail(res, "تغییر وضعیت سفارش ناموفق بود."));
  return res.json();
}

export const markOrderPaid = (id: string) => orderAction(id, "mark-paid");
export const startOrderProcessing = (id: string) => orderAction(id, "start-processing");
export const markOrderShipped = (id: string, trackingCode: string) =>
  orderAction(id, "mark-shipped", { trackingCode });
export const markOrderDelivered = (id: string) => orderAction(id, "mark-delivered");
export const cancelOrder = (id: string, reason?: string) => orderAction(id, "cancel", { reason });
