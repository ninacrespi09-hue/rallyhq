import { NextResponse } from "next/server";
import { oauthConfigured } from "@/lib/oauth";

/** Lets the login UI know which social providers are configured. */
export async function GET() {
  return NextResponse.json({
    google: oauthConfigured("google"),
    apple: oauthConfigured("apple"),
  });
}
