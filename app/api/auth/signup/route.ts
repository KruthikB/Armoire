import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getUserByEmail, createUser } from "@/lib/storage/fileStore";
import { signToken, setAuthCookie } from "@/lib/auth/session";

const schema = z.object({
  email:    z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name:     z.string().min(1, "Name is required").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id           = uuidv4();

    await createUser({
      id,
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = await signToken({ id, email, name });
    const res   = NextResponse.json({ message: "Account created." }, { status: 201 });
    return setAuthCookie(res, token);
  } catch (err) {
    console.error("[POST /api/auth/signup]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
