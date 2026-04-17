"use client";

import { useEffect, useState } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useWardrobeStore } from "@/store/useWardrobeStore";
import { ClothingItemDTO, ClothingCategory, ClothingStyle } from "@/types";
import ClothingCard from "./ClothingCard";
import UploadModal from "./UploadModal";
import ClothingDetailModal from "./ClothingDetailModal";
import { cn, formatEnum } from "@/lib/utils";

interface WardrobeClientProps {
  initialItems: ClothingItemDTO[];
}

const CATEGORIES: ClothingCategory[] = ["TOP", "BOTTOM", "FOOTWEAR", "ACCESSORY", "OUTERWEAR", "DRESS", "SUIT"];
const STYLES: ClothingStyle[] = ["CASUAL", "FORMAL", "SMART_CASUAL", "SPORTY", "STREETWEAR", "BOHEMIAN", "MINIMALIST", "VINTAGE"];

export default function WardrobeClient({ initialItems }: WardrobeClientProps) {
  const {
    items, filters, isLoading,
    setItems, setFilters, clearFilters,
    selectedItemId, setSelectedItemId,
    filteredItems,
  } = useWardrobeStore();

  const [showUpload, setShowUpload]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems, setItems]);

  const displayed = filteredItems();
  const hasFilters = !!filters.category || !!filters.style || !!filters.search;

  const categoryCount = (cat: ClothingCategory) => items.filter((i) => i.category === cat).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b border-ink/[0.07] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink">My Wardrobe</h1>
          <p className="text-sm text-ink/40 mt-0.5">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </header>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-4 md:px-8 py-3 border-b border-ink/[0.07] overflow-x-auto flex-shrink-0 scrollbar-none">
        <button
          onClick={() => setFilters({ category: undefined })}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
            !filters.category ? "bg-brand-500/10 text-brand-600" : "text-ink/40 hover:text-ink/70"
          )}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilters({ category: cat })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              filters.category === cat ? "bg-brand-500/10 text-brand-600" : "text-ink/40 hover:text-ink/70"
            )}
          >
            {formatEnum(cat)} ({categoryCount(cat)})
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 flex-shrink-0">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search by name, color, tag…"
            className="w-full bg-white border border-ink/[0.10] rounded-xl pl-9 pr-3 py-2 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
            showFilters
              ? "bg-brand-500/10 border-brand-500/20 text-brand-600"
              : "border-ink/[0.10] text-ink/50 hover:text-ink hover:bg-surface-2"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-ink/40 hover:text-ink/70 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Style filter pills */}
      {showFilters && (
        <div className="flex items-center gap-2 px-4 md:px-8 pb-4 flex-shrink-0 flex-wrap animate-fade-in">
          <span className="text-xs text-ink/40">Style:</span>
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setFilters({ style: filters.style === s ? undefined : s })}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                filters.style === s
                  ? "bg-brand-500/10 border-brand-500/20 text-brand-600"
                  : "border-ink/[0.08] text-ink/40 hover:text-ink/70 hover:border-ink/[0.15]"
              )}
            >
              {formatEnum(s)}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onUpload={() => setShowUpload(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayed.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItemId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {selectedItemId && (
        <ClothingDetailModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onUpload,
}: {
  hasFilters: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
        <Plus className="w-8 h-8 text-ink/20" />
      </div>
      <div>
        <h3 className="text-ink font-medium">
          {hasFilters ? "No matching items" : "Your wardrobe is empty"}
        </h3>
        <p className="text-ink/40 text-sm mt-1">
          {hasFilters
            ? "Try adjusting your filters"
            : "Upload your first clothing item to get started"}
        </p>
      </div>
      {!hasFilters && (
        <button
          onClick={onUpload}
          className="mt-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Upload clothing
        </button>
      )}
    </div>
  );
}
