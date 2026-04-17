/**
 * POST /api/feedback
 * Records like/dislike/worn on an outfit.
 * Updates the outfit's score in the JSON store.
 * Dislike on an item → adds its colors to the user's disliked list.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getOutfits,
  updateOutfitScore,
  updateOutfitWorn,
  incrementClothingWearCount,
  getPreferences,
  savePreferences,
  updateClothingItem,
  getWardrobe,
} from "@/lib/storage/fileStore";

const schema = z.object({
  type:          z.enum(["LIKE", "DISLIKE", "WORN"]),
  outfitId:      z.string().optional(),
  clothingItemId: z.string().optional(),
}).refine((d) => d.outfitId || d.clothingItemId, {
  message: "Either outfitId or clothingItemId is required.",
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { type, outfitId, clothingItemId } = parsed.data;

  // ── Outfit feedback ────────────────────────────────────────────────────────
  if (outfitId) {
    const outfits = await getOutfits(user.id);
    const outfit  = outfits.find((o) => o.id === outfitId);
    if (outfit) {
      // Simple score nudge: like → +0.1 (max 1.0), dislike → -0.1 (min -1.0)
      const delta    = type === "LIKE" ? 0.1 : type === "DISLIKE" ? -0.1 : 0;
      const newScore = Math.max(-1, Math.min(1, outfit.score + delta));
      await updateOutfitScore(user.id, outfitId, newScore);

      if (type === "WORN") {
        await updateOutfitWorn(user.id, outfitId);
        for (const item of outfit.items) {
          await incrementClothingWearCount(user.id, item.itemId);
        }
      }
    }
  }

  // ── Item feedback ──────────────────────────────────────────────────────────
  if (clothingItemId && type === "DISLIKE") {
    const wardrobe = await getWardrobe(user.id);
    const item     = wardrobe.find((i) => i.id === clothingItemId);
    if (item) {
      const prefs = await getPreferences(user.id) ?? {
        userId:              user.id,
        preferredStyles:     [],
        dislikedColors:      [],
        preferredOccasions:  [],
        skinTone:            null,
        gender:              null,
        city:                null,
        onboardingCompleted: false,
        updatedAt:           new Date().toISOString(),
      };
      prefs.dislikedColors = [...new Set([...prefs.dislikedColors, ...item.colors])];
      prefs.updatedAt      = new Date().toISOString();
      await savePreferences(prefs);
    }
  }

  return NextResponse.json({ message: "Feedback recorded." }, { status: 201 });
}
