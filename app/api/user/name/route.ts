import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, signToken, setAuthCookie } from "@/lib/auth/session";
import { updateUser } from "@/lib/storage/fileStore";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  await updateUser(user.id, { name: parsed.data.name });

  const newToken = await signToken({ id: user.id, email: user.email, name: parsed.data.name });
  const res = NextResponse.json({ message: "Name updated." });
  return setAuthCookie(res, newToken);
}
