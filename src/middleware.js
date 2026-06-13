import { NextResponse } from "next/server";
import { SPORT_PREF_COOKIE } from "@/lib/userSportPreference";

const SPORTS = ["volleyball", "basketball", "soccer"];
const SPORT_COOKIE = "rallyhq_sport";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  const pref = request.cookies.get(SPORT_PREF_COOKIE)?.value;
  const response = NextResponse.next();

  // Active sport context for API routes and pages.
  if (SPORTS.includes(segment)) {
    response.cookies.set(SPORT_COOKIE, segment, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else if (pathname === "/" || pathname.startsWith("/schedule/all") || pathname.startsWith("/login")) {
    response.cookies.delete(SPORT_COOKIE);
  }

  // Single-sport users stay in their sport.
  if (pref && pref !== "all") {
    if (SPORTS.includes(segment) && segment !== pref) {
      const url = request.nextUrl.clone();
      url.pathname = `/${pref}`;
      return NextResponse.redirect(url);
    }
    if (pathname === "/schedule/all") {
      const url = request.nextUrl.clone();
      url.pathname = `/${pref}/schedule`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
