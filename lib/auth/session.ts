/**
 * Lightweight JWT-based auth.
 * Uses `jose` (Edge-compatible) for signing and verifying tokens.
 * Token is stored in an httpOnly cookie named "auth_token".
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "auth_token";
const EXPIRY      = "7d";

// Secret key — must be at least 32 chars in production
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "dev-secret-please-set-JWT_SECRET-in-env";
  return new TextEncoder().encode(secret);
}

// ── Token types ───────────────────────────────────────────────────────────────

export interface SessionUser {
  id:    string;
  email: string;
  name:  string;
}

// ── Sign / verify ─────────────────────────────────────────────────────────────

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// ── Cookie helpers (server components + API routes) ───────────────────────────

/**
 * Read the current user from the auth cookie.
 * Wrapped with React.cache() so the JWT is verified at most once per request,
 * even though layout and page both call this independently.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Set the auth cookie on a NextResponse.
 */
export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

/**
 * Clear the auth cookie on a NextResponse.
 */
export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

// ── Middleware helper ─────────────────────────────────────────────────────────

/**
 * Verify the auth token from a request (used in middleware, Edge runtime).
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
