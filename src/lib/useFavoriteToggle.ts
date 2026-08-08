import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/useToast";
import { getFavorites, addFavorite, removeFavorite } from "@/lib/api";
import { loadFavoriteIds, saveFavoriteIds } from "@/lib/favoritesStorage";
import { favoritesContent as c } from "@/content/favorites";

/** Favorite state + toggle for a single product — works for both guests
 * (localStorage, no network) and logged-in users (server, TanStack cache). */
export function useFavoriteToggle(productId: string) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: (updated) => queryClient.setQueryData(["favorites"], updated),
    onError: () => showToast({ variant: "danger", message: c.toast.error }),
  });
  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: (updated) => queryClient.setQueryData(["favorites"], updated),
    onError: () => showToast({ variant: "danger", message: c.toast.error }),
  });

  const [guestIds, setGuestIds] = useState<string[]>(() => loadFavoriteIds());

  const isFavorited = isAuthenticated
    ? (favorites ?? []).some((product) => product.id === productId)
    : guestIds.includes(productId);

  function toggle() {
    if (isAuthenticated) {
      if (isFavorited) removeMutation.mutate(productId);
      else addMutation.mutate(productId);
      return;
    }
    setGuestIds((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      saveFavoriteIds(next);
      return next;
    });
  }

  return { isFavorited, toggle, isPending: addMutation.isPending || removeMutation.isPending };
}
