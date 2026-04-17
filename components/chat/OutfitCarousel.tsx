"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Shirt, CheckCircle2 } from "lucide-react";
import { OutfitPayloadDTO, ItemPreviewDTO } from "@/types";
import { cn, formatEnum, colorToHex } from "@/lib/utils";
import toast from "react-hot-toast";

interface OutfitCarouselProps {
  outfits: OutfitPayloadDTO[];
}

export default function OutfitCarousel({ outfits }: OutfitCarouselProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, "like" | "dislike">>({});
  const [worn, setWorn] = useState<Record<string, boolean>>({});

  if (!outfits.length) return null;

  const current = outfits[index];
  const items = [current.top, current.bottom, current.footwear, current.accessory]
    .filter(Boolean) as ItemPreviewDTO[];

  async function handleFeedback(type: "LIKE" | "DISLIKE") {
    if (!current.id || feedback[current.id]) return;

    setFeedback((prev) => ({
      ...prev,
      [current.id!]: type === "LIKE" ? "like" : "dislike",
    }));

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, outfitId: current.id }),
    });

    if (type === "LIKE") toast.success("Saved to favorites!");
    else toast("Got it — I'll adjust future suggestions.", { icon: "👍" });
  }

  async function handleWorn() {
    if (!current.id || worn[current.id]) return;
    setWorn((prev) => ({ ...prev, [current.id!]: true }));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WORN", outfitId: current.id }),
    });
    toast.success("Outfit marked as worn! I'll suggest fresh combinations next time.");
  }

  const currentFeedback = current.id ? feedback[current.id] : undefined;
  const isWorn = current.id ? worn[current.id] : false;

  return (
    <div className="mt-3 ml-0 sm:ml-10 animate-slide-up">
      {/* Card */}
      <div className="bg-white border border-ink/[0.08] rounded-2xl overflow-hidden w-full sm:max-w-sm shadow-sm shadow-ink/[0.04]">
        {/* Outfit name + score */}
        <div className="px-4 py-3 border-b border-ink/[0.07] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">{current.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 h-3 rounded-full",
                    i < Math.round(current.score * 5) ? "bg-brand-500" : "bg-surface-3"
                  )}
                />
              ))}
              <span className="text-xs text-ink/30 ml-1">
                {Math.round(current.score * 100)}% match
              </span>
            </div>
          </div>

          {/* Pagination */}
          {outfits.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="p-1 rounded-lg text-ink/30 hover:text-ink/70 disabled:opacity-20 transition-colors hover:bg-surface-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-ink/30 min-w-[36px] text-center">
                {index + 1}/{outfits.length}
              </span>
              <button
                onClick={() => setIndex((i) => Math.min(outfits.length - 1, i + 1))}
                disabled={index === outfits.length - 1}
                className="p-1 rounded-lg text-ink/30 hover:text-ink/70 disabled:opacity-20 transition-colors hover:bg-surface-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Item grid */}
        <div className="p-3 grid grid-cols-3 gap-2">
          {items.slice(0, 3).map((item) => (
            <OutfitItemTile key={item.id} item={item} />
          ))}
        </div>

        {/* Explanation */}
        <p className="px-4 pb-3 text-xs text-ink/50 leading-relaxed">
          {current.explanation}
        </p>

        {/* Wearing this */}
        <div className="px-4 pb-3">
          <button
            onClick={handleWorn}
            disabled={isWorn}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all border",
              isWorn
                ? "bg-emerald-50 border-emerald-500/30 text-emerald-600 cursor-default"
                : "bg-surface-1 border-ink/[0.08] text-ink/50 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500/30"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isWorn ? "Worn today!" : "Wearing this today"}
          </button>
        </div>

        {/* Feedback */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <span className="text-xs text-ink/30 flex-1">Rate this outfit</span>
          <button
            onClick={() => handleFeedback("LIKE")}
            disabled={!!currentFeedback}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              currentFeedback === "like"
                ? "bg-brand-500 text-white"
                : "bg-surface-2 text-ink/50 hover:text-ink hover:bg-surface-3"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Love it
          </button>
          <button
            onClick={() => handleFeedback("DISLIKE")}
            disabled={!!currentFeedback}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              currentFeedback === "dislike"
                ? "bg-red-100 text-red-500"
                : "bg-surface-2 text-ink/50 hover:text-ink hover:bg-surface-3"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            Not this
          </button>
        </div>
      </div>
    </div>
  );
}

function OutfitItemTile({ item }: { item: ItemPreviewDTO }) {
  return (
    <div className="space-y-1">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="120px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="w-6 h-6 text-ink/15" />
          </div>
        )}
      </div>
      <p className="text-[10px] text-ink/50 truncate px-0.5">{item.name}</p>
      <div className="flex items-center gap-1 px-0.5">
        {item.colors.slice(0, 3).map((c) => (
          <span
            key={c}
            className="w-2.5 h-2.5 rounded-full border border-ink/10"
            style={{ backgroundColor: colorToHex(c) }}
          />
        ))}
      </div>
    </div>
  );
}
