import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getClothingItemById,
  updateClothingItem,
  deleteClothingItem,
} from "@/lib/storage/fileStore";
import { deleteImage } from "@/lib/storage/imageStore";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await getClothingItemById(user.id, params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: item });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  isFavorite: z.boolean().optional(),
  brand:      z.string().optional(),
  notes:      z.string().optional(),
  name:       z.string().optional(),
  lastWorn:   z.string().optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const updated = await updateClothingItem(user.id, params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the item first to find the image URL
  const item = await getClothingItemById(user.id, params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the image file from disk
  await deleteImage(item.imageUrl);

  // Remove from JSON store
  await deleteClothingItem(user.id, params.id);

  return NextResponse.json({ message: "Item deleted." });
}
