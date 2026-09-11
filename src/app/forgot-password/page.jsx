"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setDevLink("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setDone(true);
    if (data.devResetLink) setDevLink(data.devResetLink);
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
          <h1 className="text-lg font-semibold text-navy-900">Forgot password?</h1>
          <p className="mb-4 mt-1 text-sm text-navy-500">
            Enter your account email and we&apos;ll send a secure link to choose a new password.
          </p>

          {done ? (
            <div className="space-y-3 text-sm text-navy-600">
              <p>If an account exists for that email, a reset link is on its way.</p>
              {devLink && (
                <p className="break-all text-xs">
                  Dev link:{" "}
                  <a className="text-blue-600 underline" href={devLink}>
                    {devLink}
                  </a>
                </p>
              )}
              <Link href="/login" className="inline-block font-semibold text-blue-600">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3.5">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-sm text-blue-800">{error}</p>}
              <Button disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          {!done && (
            <p className="mt-4 text-center text-sm text-navy-500">
              <Link href="/login" className="font-semibold text-blue-600">
                Back to sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
