import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getPreferences, savePreferences } from "@/lib/storage/fileStore";

const schema = z.object({
  gender:             z.enum(["MALE", "FEMALE", "NONBINARY", "PREFER_NOT"]).optional(),
  skinTone:           z.enum(["FAIR", "LIGHT", "MEDIUM", "OLIVE", "TAN", "DARK"]).optional(),
  city:               z.string().max(100).optional(),
  preferredStyles:    z.array(z.string()).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await getPreferences(user.id) ?? {
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

  await savePreferences({
    ...existing,
    gender:              parsed.data.gender              ?? existing.gender,
    skinTone:            parsed.data.skinTone            ?? existing.skinTone,
    city:                parsed.data.city                ?? existing.city,
    preferredStyles:     parsed.data.preferredStyles     ?? existing.preferredStyles,
    onboardingCompleted: parsed.data.onboardingCompleted ?? existing.onboardingCompleted,
    updatedAt:           new Date().toISOString(),
  });

  return NextResponse.json({ message: "Profile saved." });
}

export async function GET(_req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prefs = await getPreferences(user.id);
  return NextResponse.json({ data: prefs });
}
