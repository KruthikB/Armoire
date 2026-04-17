"use client";

import Image from "next/image";
import { Heart, Shirt } from "lucide-react";
import { ClothingItemDTO } from "@/types";
import { useWardrobeStore } from "@/store/useWardrobeStore";
import { cn, colorToHex, formatEnum } from "@/lib/utils";
import toast from "react-hot-toast";

interface ClothingCardProps {
  item: ClothingItemDTO;
  onClick: () => void;
}

export default function ClothingCard({ item, onClick }: ClothingCardProps) {
  const { toggleFavorite } = useWardrobeStore();

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite(item.id);

    try {
      await fetch(`/api/wardrobe/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
    } catch {
      toggleFavorite(item.id); // revert optimistic
      toast.error("Failed to update favorite.");
    }
  }

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white border border-ink/[0.08] hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-ink/10 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-3">
        {item.thumbnailUrl || item.imageUrl ? (
          <Image
            src={item.thumbnailUrl ?? item.imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2">
            <Shirt className="w-10 h-10 text-ink/15" />
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className={cn(
            "absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all",
            "opacity-0 group-hover:opacity-100",
            item.isFavorite
              ? "bg-brand-500 opacity-100"
              : "bg-black/40 backdrop-blur-sm hover:bg-brand-500/80"
          )}
        >
          <Heart
            className={cn(
              "w-3.5 h-3.5 transition-colors",
              item.isFavorite ? "fill-white text-white" : "text-white"
            )}
          />
        </button>

        {/* Category badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-ink/50 backdrop-blur-sm text-white/80 text-[10px] font-medium">
          {formatEnum(item.category)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium text-ink truncate">{item.name}</p>

        {/* Color dots */}
        <div className="flex items-center gap-1.5">
          {item.colors.slice(0, 4).map((color) => (
            <span
              key={color}
              className="w-3 h-3 rounded-full border border-ink/10 flex-shrink-0"
              style={{ backgroundColor: colorToHex(color) }}
              title={color}
            />
          ))}
          <span className="text-xs text-ink/35 ml-0.5">
            {formatEnum(item.style)}
          </span>
        </div>
      </div>
    </div>
  );
}
