import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getUserById, updateUser } from "@/lib/storage/fileStore";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const stored = await getUserById(user.id);
  if (!stored) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const valid = await bcrypt.compare(parsed.data.currentPassword, stored.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await updateUser(user.id, { passwordHash: newHash });

  return NextResponse.json({ message: "Password updated." });
}
