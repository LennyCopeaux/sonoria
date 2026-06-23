import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "access_token";

/**
 * Route protection:
 * - No session cookie on a protected route  -> redirect to /auth/login
 * - Session cookie present on an /auth route -> redirect to / (already logged in)
 *
 * The cookie is a 7-day session marker; the short-lived JWT inside is renewed
 * client-side via the refresh token, so presence here is enough to gate routes.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(TOKEN_COOKIE);
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
