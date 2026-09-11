"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not reset password.");
      return;
    }
    window.location.href = data.redirect || "/login?reset=1";
  }

  if (!token) {
    return (
      <p className="text-sm text-navy-600">
        This reset link is missing a token.{" "}
        <Link href="/forgot-password" className="font-semibold text-blue-600">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <div>
        <Label>New password</Label>
        <Input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-blue-800">{error}</p>}
      <Button disabled={loading} className="w-full">
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <h1 className="text-lg font-semibold text-navy-900">Choose a new password</h1>
          <p className="mb-4 mt-1 text-sm text-navy-500">
            Pick a password you&apos;ll use every time you return to RallyHQ.
          </p>
          <Suspense fallback={<p className="text-sm text-navy-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
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
