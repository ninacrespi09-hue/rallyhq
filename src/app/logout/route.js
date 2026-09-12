import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { getAppUrl } from "@/lib/appUrl";

// Clear the session, then send the browser to the public login page on this domain
// (never Render's internal localhost URL).
export async function GET(request) {
  await destroySession();
  const loginUrl = `${getAppUrl(request)}/login?signedOut=1`;
  console.info("[auth-logout] redirecting after sign-out", { loginUrl });
  return NextResponse.redirect(loginUrl);
}
