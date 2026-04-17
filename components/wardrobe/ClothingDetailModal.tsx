"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X, Heart, Trash2, Tag, Palette, Calendar, Star, Loader2
} from "lucide-react";
import { useWardrobeStore } from "@/store/useWardrobeStore";
import { ClothingItemDTO } from "@/types";
import { colorToHex, formatEnum, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface ClothingDetailModalProps {
  itemId: string;
  onClose: () => void;
}

export default function ClothingDetailModal({ itemId, onClose }: ClothingDetailModalProps) {
  const { items, removeItem, updateItem, toggleFavorite } = useWardrobeStore();
  const item = items.find((i) => i.id === itemId);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!item) return null;

  async function handleDelete() {
    if (!confirm("Delete this item from your wardrobe?")) return;
    setDeleting(true);
    const res = await fetch(`/api/wardrobe/${item!.id}`, { method: "DELETE" });
    if (res.ok) {
      removeItem(item!.id);
      toast.success("Item removed.");
      onClose();
    } else {
      toast.error("Failed to delete item.");
      setDeleting(false);
    }
  }

  async function handleFavorite() {
    toggleFavorite(item!.id);
    await fetch(`/api/wardrobe/${item!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !item!.isFavorite }),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl glass sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up flex flex-col sm:flex-row sm:max-h-[90vh] max-h-[92vh]">
        {/* Image panel */}
        <div className="w-full sm:w-64 flex-shrink-0 relative bg-surface-2 aspect-video sm:aspect-auto">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag className="w-12 h-12 text-ink/15" />
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-ink/[0.07]">
            <div className="flex-1 mr-4">
              <p className="text-xs text-brand-600 font-medium mb-1">{formatEnum(item.category)}</p>
              <h2 className="text-base font-semibold text-ink leading-snug">{item.name}</h2>
              {item.brand && (
                <p className="text-sm text-ink/40 mt-0.5">{item.brand}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleFavorite}
                className="p-2 rounded-xl hover:bg-surface-2 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    item.isFavorite ? "fill-brand-500 text-brand-500" : "text-ink/30"
                  }`}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-2 transition-colors text-ink/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attributes */}
          <div className="p-5 space-y-4 flex-1">
            {/* Colors */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-ink/40">
                <Palette className="w-3.5 h-3.5" />
                Colors
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {item.colors.map((c) => (
                  <div key={c} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-ink/10"
                      style={{ backgroundColor: colorToHex(c) }}
                    />
                    <span className="text-sm text-ink/60 capitalize">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-ink/40">
                <Tag className="w-3.5 h-3.5" />
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-surface-2 rounded-lg text-xs text-ink/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Style",    value: formatEnum(item.style) },
                { label: "Season",   value: formatEnum(item.season) },
                { label: "Material", value: item.material ?? "—" },
                { label: "Pattern",  value: item.pattern  ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-surface-1 border border-ink/[0.07] rounded-xl">
                  <p className="text-xs text-ink/35 mb-0.5">{label}</p>
                  <p className="text-sm text-ink capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Occasions */}
            {item.occasion?.length > 0 && (
              <div>
                <p className="text-xs text-ink/40 mb-1.5">Occasions</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.occasion.map((o) => (
                    <span key={o} className="px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs text-brand-600 capitalize">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Wear count */}
            <div className="flex items-center gap-4 text-sm text-ink/40 pt-1">
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Worn {item.wearCount} {item.wearCount === 1 ? "time" : "times"}
              </div>
              {item.lastWorn && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Last worn {formatDate(item.lastWorn)}
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-ink/50 leading-relaxed border-t border-ink/[0.07] pt-4">
                {item.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-sm text-red-500/60 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove from wardrobe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
