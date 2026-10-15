import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { defaultDemoEmailFor } from "@/lib/demo-mode";

/**
 * Optimistic check only: no session cookie means sign in first (automatically, when a default demo person is set). The
 * real check (a valid session, and `can()`) happens on the server in each page and action, because a cookie can be
 * stale or forged.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const next = pathname + search;
  if (defaultDemoEmailFor()) {
    const auto = new URL("/auto-sign-in", request.url);
    auto.searchParams.set("next", next);
    return NextResponse.redirect(auto);
  }
  const url = new URL("/sign-in", request.url);
  if (pathname !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // everything except the sign-in page, the auto sign-in route, the auth API, Next's assets and the icon
  matcher: ["/((?!sign-in|auto-sign-in|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
