import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login?signedOut=1", request.url));
}
