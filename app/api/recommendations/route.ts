/**
 * POST /api/recommendations
 * Standalone recommendation endpoint (outside chat context).
 * Used by the wardrobe page "Quick Outfit" button.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWardrobe } from "@/lib/storage/fileStore";
import { generateOutfits } from "@/lib/ai/recommendations";
import { z } from "zod";

const requestSchema = z.object({
  occasion:       z.string().min(1).max(200),
  context:        z.string().optional(),
  excludeItemIds: z.array(z.string()).optional(),
  preferColors:   z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  try {
    const wardrobe   = await getWardrobe(session.id);
    const suggestions = generateOutfits({
      wardrobe,
      occasion:       parsed.data.occasion,
      excludeItemIds: parsed.data.excludeItemIds,
      preferColors:   parsed.data.preferColors,
    });

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    console.error("[POST /api/recommendations]", error);
    return NextResponse.json({ error: "Recommendation engine failed." }, { status: 500 });
  }
}
