/**
 * Next.js Edge Middleware — JWT-based route protection.
 * Runs on every request before it hits the page/API.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/api/auth/login", "/api/auth/signup"];
// Static asset patterns to skip entirely
const SKIP_PREFIXES = ["/_next", "/uploads", "/favicon"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next.js internals
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith("/api/auth/")
  );

  const user = await getSessionFromRequest(req);

  // Not logged in → redirect to login (or 401 for API routes)
  if (!isPublic && !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in → redirect away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/wardrobe", req.url));
  }

  // Forward pathname so server components can read it via headers()
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
