import { NextResponse } from "next/server";

const SPORTS = ["volleyball", "basketball", "soccer"];
const SPORT_COOKIE = "rallyhq_sport";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  const response = NextResponse.next();

  if (SPORTS.includes(segment)) {
    response.cookies.set(SPORT_COOKIE, segment, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  if (pathname === "/" || pathname.startsWith("/schedule/all") || pathname.startsWith("/login")) {
    response.cookies.delete(SPORT_COOKIE);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
