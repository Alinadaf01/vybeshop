import { loadStoredAdminAuth, saveStoredAdminAuth, clearStoredAdminAuth } from "@/lib/adminAuthStorage";
import type { AdminLoginResponse } from "@/types/adminAuth";
import type { PaginatedResponse } from "@/types/api";
import type { AdminCategory, CategoryFormValues } from "@/types/category";
import type { Attribute, AttributeFormValues, AttributeValue } from "@/types/attribute";
import type { AdminProduct, ColorOption, ProductFormValues, ProductImage, ProductSpecEntry, ProductSpecRow } from "@/types/product";
import type { AdminOrder } from "@/types/order";
import type { AdminSiteSettings, ApiCredential, ApiCredentialService, ShippingMethod } from "@/types/settings";
import type { AdminAddress, AdminUser, AdminUserListItem, CreateUserFormValues, UpdateUserFormValues } from "@/types/user";
import type { AdminContactMessage } from "@/types/message";
import type { CreateStockMovementValues, InventoryRow, InventorySummary, StockMovement } from "@/types/inventory";

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

// ---------------------------------------------------------------------------
// Settings (§12)
// ---------------------------------------------------------------------------

export async function getSiteSettings(): Promise<AdminSiteSettings> {
  const res = await authorizedFetch("/settings/site/");
  return parseOrThrow(res, "دریافت تنظیمات ناموفق بود.");
}

export async function updateSiteSettings(
  data: Partial<AdminSiteSettings>,
  imageFiles?: Partial<Record<"trustBadgeImage" | "logoLight" | "logoDark" | "favicon" | "defaultOgImage", File>>,
): Promise<AdminSiteSettings> {
  const hasFiles = imageFiles && Object.values(imageFiles).some(Boolean);
  let init: RequestInit;
  if (hasFiles) {
    const form = buildFormData(data);
    for (const [key, file] of Object.entries(imageFiles ?? {})) {
      if (file) form.append(key, file);
    }
    init = { method: "PATCH", body: form };
  } else {
    init = { method: "PATCH", body: JSON.stringify(data) };
  }
  const res = await authorizedFetch("/settings/site/", init);
  return parseOrThrow(res, "ذخیره تنظیمات ناموفق بود.");
}

export async function listCredentials(): Promise<ApiCredential[]> {
  const res = await authorizedFetch("/settings/credentials/");
  return parseOrThrow(res, "دریافت کلیدهای API ناموفق بود.");
}

export async function createCredential(data: {
  service: ApiCredentialService;
  label: string;
  isActive: boolean;
  isSandbox: boolean;
  order: number;
  credentials: Record<string, string>;
}): Promise<ApiCredential> {
  const res = await authorizedFetch("/settings/credentials/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "افزودن کلید ناموفق بود.");
}

export async function updateCredential(
  id: string,
  data: Partial<{
    label: string;
    isActive: boolean;
    isSandbox: boolean;
    order: number;
    credentials: Record<string, string>;
  }>,
): Promise<ApiCredential> {
  const res = await authorizedFetch(`/settings/credentials/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش کلید ناموفق بود.");
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await authorizedFetch(`/settings/credentials/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف کلید ناموفق بود.");
}

export async function listShippingMethods(): Promise<ShippingMethod[]> {
  const res = await authorizedFetch("/settings/shipping-methods/");
  return parseOrThrow(res, "دریافت روش‌های ارسال ناموفق بود.");
}

export async function createShippingMethod(
  data: Omit<ShippingMethod, "id">,
): Promise<ShippingMethod> {
  const res = await authorizedFetch("/settings/shipping-methods/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "افزودن روش ارسال ناموفق بود.");
}

export async function updateShippingMethod(
  id: string,
  data: Partial<Omit<ShippingMethod, "id">>,
): Promise<ShippingMethod> {
  const res = await authorizedFetch(`/settings/shipping-methods/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش روش ارسال ناموفق بود.");
}

export async function deleteShippingMethod(id: string): Promise<void> {
  const res = await authorizedFetch(`/settings/shipping-methods/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف روش ارسال ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Users (§9)
// ---------------------------------------------------------------------------

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isVerified?: string;
}

export async function listUsers(params: UserListParams): Promise<PaginatedResponse<AdminUserListItem>> {
  const res = await authorizedFetch(`/users/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت کاربران ناموفق بود.");
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await authorizedFetch(`/users/${id}/`);
  return parseOrThrow(res, "دریافت کاربر ناموفق بود.");
}

export async function createUser(data: CreateUserFormValues): Promise<AdminUser> {
  const res = await authorizedFetch("/users/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "ایجاد کاربر ناموفق بود.");
}

export async function updateUser(id: string, data: Partial<UpdateUserFormValues>): Promise<AdminUser> {
  const res = await authorizedFetch(`/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش کاربر ناموفق بود.");
}

export async function listUserAddresses(userId: string): Promise<AdminAddress[]> {
  const res = await authorizedFetch(`/users/${userId}/addresses/`);
  return parseOrThrow(res, "دریافت آدرس‌ها ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Messages (§10)
// ---------------------------------------------------------------------------

export interface MessageListParams {
  page?: number;
  pageSize?: number;
  isRead?: string;
  subject?: string;
}

export async function listMessages(params: MessageListParams): Promise<PaginatedResponse<AdminContactMessage>> {
  const res = await authorizedFetch(`/messages/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت پیام‌ها ناموفق بود.");
}

export async function getMessage(id: string): Promise<AdminContactMessage> {
  const res = await authorizedFetch(`/messages/${id}/`);
  return parseOrThrow(res, "دریافت پیام ناموفق بود.");
}

export async function updateMessage(
  id: string,
  data: Partial<{ isRead: boolean; adminNote: string }>,
): Promise<AdminContactMessage> {
  const res = await authorizedFetch(`/messages/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ویرایش پیام ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Inventory (§8, §13)
// ---------------------------------------------------------------------------

export interface InventoryListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  isLow?: string;
}

export async function listInventory(params: InventoryListParams): Promise<PaginatedResponse<InventoryRow>> {
  const res = await authorizedFetch(`/inventory/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت موجودی ناموفق بود.");
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const res = await authorizedFetch("/inventory/summary/");
  return parseOrThrow(res, "دریافت خلاصه موجودی ناموفق بود.");
}

export async function updateStockAlert(
  productId: number,
  data: { reorderPoint: number; isActive: boolean },
): Promise<{ reorderPoint: number; isActive: boolean }> {
  const res = await authorizedFetch(`/inventory/${productId}/alert/`, { method: "PATCH", body: JSON.stringify(data) });
  return parseOrThrow(res, "ذخیره هشدار موجودی ناموفق بود.");
}

export interface StockMovementListParams {
  page?: number;
  pageSize?: number;
  product?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listStockMovements(params: StockMovementListParams): Promise<PaginatedResponse<StockMovement>> {
  const res = await authorizedFetch(`/stock-movements/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت کاردکس ناموفق بود.");
}

export async function createStockMovement(data: CreateStockMovementValues): Promise<StockMovement> {
  const res = await authorizedFetch("/stock-movements/", { method: "POST", body: JSON.stringify(data) });
  return parseOrThrow(res, "ثبت حرکت انبار ناموفق بود.");
}

export async function downloadStockMovementsExport(params: StockMovementListParams): Promise<void> {
  const res = await authorizedFetch(`/stock-movements/export/${buildQuery({ ...params, format: "xlsx" })}`);
  if (!res.ok) throw new Error(await readErrorDetail(res, "خروجی اکسل ناموفق بود."));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock-movements.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
