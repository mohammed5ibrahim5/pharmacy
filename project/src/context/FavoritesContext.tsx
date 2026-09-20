import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FavoritesState {
  products: string[];
  pharmacies: string[];
}

interface FavoritesContextType {
  favoriteProducts: string[];
  favoritePharmacies: string[];
  favoriteCount: number;
  productFavoritesCount: number;
  pharmacyFavoritesCount: number;
  isProductFavorite: (id: string) => boolean;
  isPharmacyFavorite: (id: string) => boolean;
  toggleProductFavorite: (id: string) => void;
  togglePharmacyFavorite: (id: string) => void;
}

const STORAGE_KEY = 'pharmacy_favorites';

function loadFavorites(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FavoritesState>;
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        pharmacies: Array.isArray(parsed.pharmacies) ? parsed.pharmacies : [],
      };
    }
  } catch {
    // fallback to empty
  }
  return { products: [], pharmacies: [] };
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteProducts: [],
  favoritePharmacies: [],
  favoriteCount: 0,
  productFavoritesCount: 0,
  pharmacyFavoritesCount: 0,
  isProductFavorite: () => false,
  isPharmacyFavorite: () => false,
  toggleProductFavorite: () => {},
  togglePharmacyFavorite: () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoritesState>(() => {
    if (typeof window === 'undefined') return { products: [], pharmacies: [] };
    return loadFavorites();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleProductFavorite = (id: string) =>
    setState((s) => ({ ...s, products: toggleInList(s.products, id) }));

  const togglePharmacyFavorite = (id: string) =>
    setState((s) => ({ ...s, pharmacies: toggleInList(s.pharmacies, id) }));

  return (
    <FavoritesContext.Provider
      value={{
        favoriteProducts: state.products,
        favoritePharmacies: state.pharmacies,
        favoriteCount: state.products.length + state.pharmacies.length,
        productFavoritesCount: state.products.length,
        pharmacyFavoritesCount: state.pharmacies.length,
        isProductFavorite: (id) => state.products.includes(id),
        isPharmacyFavorite: (id) => state.pharmacies.includes(id),
        toggleProductFavorite,
        togglePharmacyFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
