import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Favorite } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { addFavorite, getFavorites, removeFavorite as deleteFavorite } from '@/services/favoriteService';

type FavoriteInput = Omit<Favorite, 'id' | 'addedAt'>;

interface FavoritesContextValue {
  favorites: Favorite[];
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (item: FavoriteInput) => boolean; // returns new state
  removeFavorite: (itemId: string) => void;
}

const KEY = 'tourista.favorites';
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function load(): Favorite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Favorite[];
  } catch {
    return [];
  }
}

function saveLocal(favorites: Favorite[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch { /* ignore */ }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const useApi = isAuthenticated;
  const [favorites, setFavorites] = useState<Favorite[]>(load);

  useEffect(() => {
    if (!useApi) {
      setFavorites(load());
      return;
    }
    let cancelled = false;
    const local = load();
    (async () => {
      try {
        await Promise.all(local.map((item) => addFavorite({
          itemId: item.itemId, itemType: item.itemType, title: item.title, subtitle: item.subtitle, image: item.image, href: item.href,
        }).catch(() => undefined)));
        const remote = await getFavorites();
        if (!cancelled) {
          setFavorites(remote);
          saveLocal([]);
        }
      } catch {
        if (!cancelled) setFavorites(load());
      }
    })();
    return () => { cancelled = true; };
  }, [useApi]);

  useEffect(() => {
    if (!useApi) saveLocal(favorites);
  }, [favorites, useApi]);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.itemId === id), [favorites]);

  const toggleFavorite = useCallback(
    (item: FavoriteInput) => {
      const exists = favorites.some((f) => f.itemId === item.itemId);
      const next = exists
        ? favorites.filter((f) => f.itemId !== item.itemId)
        : [{ ...item, id: `fav-${item.itemId}`, addedAt: new Date().toISOString() }, ...favorites];
      setFavorites(next);
      if (useApi) {
        const op = exists ? deleteFavorite(item.itemId) : addFavorite(item);
        op.catch(() => setFavorites(favorites));
      }
      return !exists;
    },
    [favorites, useApi],
  );

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.itemId !== id));
    if (useApi) deleteFavorite(id).catch(() => undefined);
  }, [useApi]);

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite, removeFavorite }), [favorites, isFavorite, toggleFavorite, removeFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
