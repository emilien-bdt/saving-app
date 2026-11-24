import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, SESSION_COOKIE } from "@/shared/auth/config";
import { verifySessionToken } from "@/shared/auth/session";

/** Redirects every unauthenticated request to /login (Next 16 "proxy", formerly middleware). */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = token ? (await verifySessionToken(token, getAuthConfig().sessionSecret)) !== null : false;

  // Invitation links (sign-up, password reset) work without an account.
  if (pathname.startsWith("/invitation/")) return NextResponse.next();
  // The login page itself sends signed-in users home (it can check that the account is still active).
  if (pathname === "/login") return NextResponse.next();
  if (authenticated) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Public assets: Next internals, icons and the PWA manifest (iOS fetches it without cookies).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|apple-icon|manifest.webmanifest).*)"],
};
