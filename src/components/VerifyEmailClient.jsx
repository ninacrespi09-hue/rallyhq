"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  // Email only in the URL — never auto-submit a one-time code from query params
  // (mail scanners / prefetch would burn the code before the player types it).
  const emailParam = searchParams.get("email") || "";
  const mailError = searchParams.get("mailError") === "1";
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState(
    mailError
      ? "We could not send the verification email yet. Email delivery still needs to be set up on the server (Resend + Render env vars)."
      : ""
  );
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  // Submit the 6-digit code + email together (required for validation).
  async function submitCode(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("pending");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: code, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "That code is invalid or expired.");
      return;
    }
    setStatus("done");
    window.location.href = data.redirect || "/";
  }

  async function resend(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevLink("");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Could not resend.");
      return;
    }
    setStatus("pending");
    setMessage("If that email needs verification, we sent a new code.");
    if (data.devVerifyLink) setDevLink(data.devVerifyLink);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-500 text-white">
          <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="text-xl font-semibold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="p-5">
          <h1 className="text-lg font-semibold text-navy-900">Verify your email</h1>
          <p className="mb-4 mt-1 text-sm text-navy-500">
            Check your inbox for a 6-digit code from RallyHQ, then enter it below with the same email.
          </p>

          {status === "error" && (
            <p className="mb-3 rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800">{message}</p>
          )}

          {status !== "done" && (
            <div className="space-y-5">
              <form onSubmit={submitCode} className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label>Verification code</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    className="tracking-widest"
                  />
                </div>
                <Button disabled={loading || !code.trim() || !email.trim()} className="w-full">
                  {loading ? "Checking…" : "Verify code"}
                </Button>
              </form>

              <form onSubmit={resend} className="space-y-3 border-t border-blue-100 pt-4">
                {message && status !== "error" && (
                  <p className="text-sm text-navy-600">{message}</p>
                )}
                {devLink && (
                  <p className="break-all text-xs text-navy-500">
                    Dev link:{" "}
                    <a className="text-blue-600 underline" href={devLink}>
                      {devLink}
                    </a>
                  </p>
                )}
                <Button type="submit" variant="outline" disabled={loading || !email.trim()} className="w-full">
                  {loading ? "Sending…" : "Resend verification email"}
                </Button>
              </form>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-navy-500">
            <Link href="/login" className="font-semibold text-blue-600">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
