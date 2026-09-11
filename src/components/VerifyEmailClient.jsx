"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";
  const [status, setStatus] = useState(token ? "verifying" : "pending");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(emailParam);
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Verification failed.");
        return;
      }
      setStatus("done");
      window.location.href = data.redirect || "/";
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
      setMessage(data.error || "Could not resend.");
      return;
    }
    setMessage("If that email needs verification, we sent a new link.");
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
            {status === "verifying"
              ? "Confirming your email…"
              : "Check your inbox for a verification link from RallyHQ. Your account stays saved — you just need to confirm the address."}
          </p>

          {status === "error" && (
            <p className="mb-3 rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800">{message}</p>
          )}

          {status !== "verifying" && status !== "done" && (
            <form onSubmit={resend} className="space-y-3">
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
              {message && <p className="text-sm text-navy-600">{message}</p>}
              {devLink && (
                <p className="break-all text-xs text-navy-500">
                  Dev link:{" "}
                  <a className="text-blue-600 underline" href={devLink}>
                    {devLink}
                  </a>
                </p>
              )}
              <Button disabled={loading} className="w-full">
                {loading ? "Sending…" : "Resend verification email"}
              </Button>
            </form>
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
