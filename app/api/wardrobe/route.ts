/**
 * GET  /api/wardrobe — list the user's clothing items
 * POST /api/wardrobe — upload a new item
 *
 * Upload flow (1 Gemini API call total):
 *   1. Save image to disk              → 0 API calls
 *   2. Gemini Vision analyses it       → 1 API call (result stored forever)
 *   3. Write item to wardrobe JSON     → 0 API calls
 */
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getWardrobe, addClothingItem } from "@/lib/storage/fileStore";
import { saveImage } from "@/lib/storage/imageStore";
import { analyzeClothingImages } from "@/lib/ai/gemini";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? "";
  const style    = searchParams.get("style")    ?? "";
  const search   = searchParams.get("search")   ?? "";

  let items = await getWardrobe(user.id);

  if (category) items = items.filter((i) => i.category === category);
  if (style)    items = items.filter((i) => i.style === style);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q)) ||
        i.colors.some((c) => c.includes(q)) ||
        (i.description ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ data: items });
}

// ── POST ──────────────────────────────────────────────────────────────────────
// Accepts up to 4 images in one request → 1 Gemini API call total.

const imageEntrySchema = z.object({
  imageData: z.string().min(10, "Image data required"),
  brand:     z.string().optional(),
  notes:     z.string().optional(),
});

const uploadSchema = z.object({
  images: z.array(imageEntrySchema).min(1).max(4, "Maximum 4 images per upload"),
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body   = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { images } = parsed.data;

    // 1. Save images sequentially — Cloudinary free tier rejects parallel uploads
    const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
    for (const img of images) {
      saved.push(await saveImage(img.imageData, user.id));
    }

    // 2. Extract base64 strings (strip data URI prefix)
    const base64Array = images.map((img) =>
      img.imageData.replace(/^data:[^;]+;base64,/, "")
    );

    // 3. ONE Gemini Vision call for all images
    const analyses = await analyzeClothingImages(base64Array);

    // 4. Build and persist all clothing items in parallel (Postgres handles concurrent inserts safely)
    const now   = new Date().toISOString();
    const items = analyses.map((analysis, i) => ({
      id:          uuidv4(),
      userId:      user.id,
      name:        analysis.name,
      imageUrl:    saved[i].url,
      category:    analysis.category,
      style:       analysis.style,
      colors:      analysis.colors,
      tags:        analysis.tags,
      season:      analysis.season,
      occasion:    analysis.occasion,
      material:    analysis.material,
      pattern:     analysis.pattern,
      description: analysis.description,
      brand:       images[i].brand ?? null,
      notes:       images[i].notes ?? null,
      isFavorite:  false,
      wearCount:   0,
      lastWorn:    null,
      createdAt:   now,
      updatedAt:   now,
    }));
    await Promise.all(items.map(addClothingItem));

    return NextResponse.json({ data: items }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/wardrobe]", err);
    return NextResponse.json({ error: "Failed to process images." }, { status: 500 });
  }
}
