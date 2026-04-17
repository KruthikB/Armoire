import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOutfits } from "@/lib/storage/fileStore";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const occasion = searchParams.get("occasion") ?? "";

  let outfits = await getOutfits(user.id);
  if (occasion) outfits = outfits.filter((o) => o.occasion === occasion);

  // Sort by score desc, then newest first
  outfits.sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ data: outfits });
}
