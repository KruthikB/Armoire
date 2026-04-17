/**
 * Zustand store for wardrobe state — clothing items, filters, upload status.
 */
import { create } from "zustand";
import { ClothingItemDTO, ClothingCategory, ClothingStyle } from "@/types";

interface WardrobeFilters {
  category?: ClothingCategory;
  style?: ClothingStyle;
  search: string;
}

interface WardrobeState {
  items: ClothingItemDTO[];
  filters: WardrobeFilters;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number; // 0-100
  selectedItemId: string | null;

  // Actions
  setItems: (items: ClothingItemDTO[]) => void;
  addItem: (item: ClothingItemDTO) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ClothingItemDTO>) => void;
  setFilters: (filters: Partial<WardrobeFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  setSelectedItemId: (id: string | null) => void;
  toggleFavorite: (id: string) => void;

  // Derived
  filteredItems: () => ClothingItemDTO[];
}

const DEFAULT_FILTERS: WardrobeFilters = { search: "" };

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  items: [],
  filters: DEFAULT_FILTERS,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  selectedItemId: null,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((state) => ({ items: [item, ...state.items] })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),

  setLoading: (isLoading) => set({ isLoading }),

  setUploading: (isUploading, uploadProgress = 0) =>
    set({ isUploading, uploadProgress }),

  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),

  toggleFavorite: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
      ),
    })),

  filteredItems: () => {
    const { items, filters } = get();
    return items.filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.style && item.style !== filters.style) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.colors.some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    });
  },
}));
