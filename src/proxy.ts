import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, SESSION_COOKIE } from "@/shared/auth/config";
import { verifySessionToken } from "@/shared/auth/session";

/** Redirects every unauthenticated request to /login (Next 16 "proxy", formerly middleware). */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = token ? await verifySessionToken(token, getAuthConfig().sessionSecret) : false;

  if (pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (authenticated) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Public assets: Next internals, icons and the PWA manifest (iOS fetches it without cookies).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|apple-icon|manifest.webmanifest).*)"],
};
