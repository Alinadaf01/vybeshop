const STORAGE_KEY = "vybe-favorites";

// Same SSR-safety concern as authStorage.ts — this can be read during the
// build-time prerender pass, where localStorage doesn't exist.
const hasLocalStorage = typeof localStorage !== "undefined";

export function loadFavoriteIds(): string[] {
  if (!hasLocalStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids: string[]): void {
  if (!hasLocalStorage) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function clearFavoriteIds(): void {
  if (!hasLocalStorage) return;
  localStorage.removeItem(STORAGE_KEY);
}
