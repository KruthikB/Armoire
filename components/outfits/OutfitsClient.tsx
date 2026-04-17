"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutGrid, Sparkles, MessageSquare, ThumbsUp, ThumbsDown,
  Shirt, Calendar, History, CheckCircle2,
} from "lucide-react";
import { cn, formatEnum } from "@/lib/utils";
import toast from "react-hot-toast";

interface OutfitItemRef {
  role:         string;
  itemId:       string;
  itemName:     string;
  thumbnailUrl: string | null;
  colors:       string[];
  category:     string;
}

interface OutfitRecord {
  id:            string;
  name:          string;
  description:   string | null;
  occasion:      string;
  style:         string;
  score:         number;
  wearCount:     number;
  lastWorn:      string | null;
  isAiGenerated: boolean;
  createdAt:     string;
  items:         OutfitItemRef[];
}

interface OutfitsClientProps {
  initialOutfits: OutfitRecord[];
}

const OCCASION_FILTERS = ["all", "casual", "formal", "work", "dinner", "party", "sport"];
const THIRTY_DAYS_MS   = 30 * 24 * 60 * 60 * 1000;

function daysAgoLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function OutfitsClient({ initialOutfits }: OutfitsClientProps) {
  const [outfits,        setOutfits]      = useState(initialOutfits);
  const [activeTab,      setActiveTab]    = useState<"all" | "worn">("all");
  const [occasionFilter, setOccasion]     = useState("all");
  const [feedback,       setFeedback]     = useState<Record<string, "like" | "dislike">>({});
  const [wornState,      setWornState]    = useState<Record<string, boolean>>({});

  const wornHistory = outfits
    .filter((o) => o.lastWorn && (Date.now() - new Date(o.lastWorn).getTime()) <= THIRTY_DAYS_MS)
    .sort((a, b) => new Date(b.lastWorn!).getTime() - new Date(a.lastWorn!).getTime());

  const allFiltered = occasionFilter === "all"
    ? outfits
    : outfits.filter((o) => o.occasion === occasionFilter);

  const displayed = activeTab === "worn" ? wornHistory : allFiltered;

  async function sendFeedback(outfitId: string, type: "LIKE" | "DISLIKE") {
    if (feedback[outfitId]) return;
    setFeedback((prev) => ({ ...prev, [outfitId]: type === "LIKE" ? "like" : "dislike" }));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, outfitId }),
    });
    if (type === "LIKE") toast.success("Saved to favorites!");
  }

  async function markWorn(outfitId: string) {
    if (wornState[outfitId]) return;
    setWornState((prev) => ({ ...prev, [outfitId]: true }));
    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfitId
          ? { ...o, wearCount: o.wearCount + 1, lastWorn: new Date().toISOString() }
          : o
      )
    );
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WORN", outfitId }),
    });
    toast.success("Outfit marked as worn!");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b border-ink/[0.07] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink">Saved Outfits</h1>
          <p className="text-sm text-ink/40 mt-0.5">{outfits.length} outfits from AI sessions</p>
        </div>
        <Link
          href="/chat"
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          New outfit
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 md:px-8 pt-3 border-b border-ink/[0.07] flex-shrink-0">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "all"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-ink/40 hover:text-ink/70"
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          All Outfits
        </button>
        <button
          onClick={() => setActiveTab("worn")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "worn"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-ink/40 hover:text-ink/70"
          )}
        >
          <History className="w-3.5 h-3.5" />
          Worn History
          {wornHistory.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-surface-3 text-ink/40 text-[10px]">
              {wornHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Occasion filter */}
      {activeTab === "all" && (
        <div className="flex items-center gap-1 px-4 md:px-8 py-3 border-b border-ink/[0.07] overflow-x-auto flex-shrink-0">
          {OCCASION_FILTERS.map((occ) => (
            <button
              key={occ}
              onClick={() => setOccasion(occ)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors capitalize",
                occasionFilter === occ
                  ? "bg-brand-500/10 text-brand-600"
                  : "text-ink/40 hover:text-ink/70"
              )}
            >
              {occ}
            </button>
          ))}
        </div>
      )}

      {/* Worn history subheader */}
      {activeTab === "worn" && (
        <div className="px-4 md:px-8 py-3 border-b border-ink/[0.07] flex-shrink-0">
          <p className="text-xs text-ink/35">
            Outfits you&apos;ve worn in the last 30 days · {wornHistory.length} outfit{wornHistory.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            {activeTab === "worn" ? (
              <>
                <History className="w-10 h-10 text-ink/15" />
                <p className="text-ink/40">
                  No worn outfits in the last 30 days.<br />
                  Mark an outfit as &ldquo;Wearing this today&rdquo; to track it here.
                </p>
              </>
            ) : (
              <>
                <LayoutGrid className="w-10 h-10 text-ink/15" />
                <p className="text-ink/40">
                  No outfits yet — start a chat to get outfit recommendations
                </p>
                <Link
                  href="/chat"
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Chat with Aria
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                feedbackState={feedback[outfit.id]}
                isWorn={wornState[outfit.id] || (outfit.lastWorn
                  ? (Date.now() - new Date(outfit.lastWorn).getTime()) < 86_400_000 * 0.5
                  : false)}
                showWornDate={activeTab === "worn"}
                onFeedback={(type) => sendFeedback(outfit.id, type)}
                onMarkWorn={() => markWorn(outfit.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OutfitCard({
  outfit,
  feedbackState,
  isWorn,
  showWornDate,
  onFeedback,
  onMarkWorn,
}: {
  outfit:        OutfitRecord;
  feedbackState?: "like" | "dislike";
  isWorn:        boolean;
  showWornDate:  boolean;
  onFeedback:    (type: "LIKE" | "DISLIKE") => void;
  onMarkWorn:    () => void;
}) {
  return (
    <div className="bg-white border border-ink/[0.08] rounded-2xl overflow-hidden hover:border-brand-500/20 hover:shadow-md hover:shadow-ink/[0.06] transition-all hover:-translate-y-0.5">
      {/* Item thumbnails */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {outfit.items.slice(0, 3).map((item) => (
          <div key={item.itemId} className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.itemName}
                fill
                className="object-cover"
                sizes="120px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt className="w-5 h-5 text-ink/15" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="px-4 pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink text-sm truncate">{outfit.name}</p>
          {outfit.isAiGenerated && (
            <span className="flex items-center gap-1 text-[10px] text-brand-600 ml-2 flex-shrink-0">
              <Sparkles className="w-3 h-3" />
              AI
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink/35 flex-wrap">
          <span className="capitalize">{outfit.occasion}</span>
          <span>·</span>
          <span>{formatEnum(outfit.style)}</span>
          {outfit.wearCount > 0 && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Worn {outfit.wearCount}×
              </div>
            </>
          )}
        </div>

        {showWornDate && outfit.lastWorn && (
          <div className="flex items-center gap-1 text-xs text-emerald-600/80">
            <CheckCircle2 className="w-3 h-3" />
            {daysAgoLabel(outfit.lastWorn)}
          </div>
        )}

        {outfit.description && (
          <p className="text-xs text-ink/40 leading-relaxed line-clamp-2 pt-0.5">
            {outfit.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-ink/[0.06] flex items-center gap-2">
        <button
          onClick={onMarkWorn}
          disabled={isWorn}
          className={cn(
            "flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium transition-all border",
            isWorn
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-600 cursor-default"
              : "border-ink/[0.08] bg-surface-1 text-ink/40 hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-50"
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          {isWorn ? "Worn today" : "Wore this"}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onFeedback("LIKE")}
            disabled={!!feedbackState}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              feedbackState === "like"
                ? "bg-brand-500/15 text-brand-600"
                : "text-ink/25 hover:text-ink/60 hover:bg-surface-2"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFeedback("DISLIKE")}
            disabled={!!feedbackState}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              feedbackState === "dislike"
                ? "bg-red-500/15 text-red-500"
                : "text-ink/25 hover:text-ink/60 hover:bg-surface-2"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
