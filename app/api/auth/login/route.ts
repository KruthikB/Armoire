import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getUserByEmail } from "@/lib/storage/fileStore";
import { signToken, setAuthCookie } from "@/lib/auth/session";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await getUserByEmail(email);
    if (!user) {
      // Constant-time response to prevent user enumeration
      await bcrypt.hash("dummy", 1);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signToken({ id: user.id, email: user.email, name: user.name });
    const res   = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    return setAuthCookie(res, token);
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
