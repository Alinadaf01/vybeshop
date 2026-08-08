const STORAGE_KEY = "vybe-cart-session";

export function getCartSessionKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setCartSessionKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearCartSessionKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
