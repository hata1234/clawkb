import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Pages that don't require authentication
const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/logo-") ||
    pathname.startsWith("/manifest.json") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Allow API routes (they handle their own auth via Bearer token or session)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for session token
  const token = await getToken({ req: request });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image).*)",
  ],
};
