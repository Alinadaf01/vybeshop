import { loadStoredAdminAuth, saveStoredAdminAuth, clearStoredAdminAuth } from "@/lib/adminAuthStorage";
import type { AdminLoginResponse } from "@/types/adminAuth";

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

  const doFetch = (accessToken: string) =>
    apiFetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${accessToken}` },
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
