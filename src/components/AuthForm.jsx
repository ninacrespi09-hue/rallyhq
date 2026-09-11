"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { POSITIONS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialAuthButtons from "@/components/SocialAuthButtons";

const SAVED_EMAIL_KEY = "rallyhq_email";

// coachOnly = coach creates a new team at /signup/coach
// prefilledCode = player/parent joins via /join/CODE invite link only
// signupRole = 'player' | 'parent' when joining via invite
export default function AuthForm({ mode, prefilledCode, teamName, coachOnly = false, signupRole = "player" }) {
  const searchParams = useSearchParams();
  const signedOut = searchParams.get("signedOut") === "1";
  const resetOk = searchParams.get("reset") === "1";
  const oauthError = searchParams.get("oauthError") || "";
  const isSignup = mode === "signup";
  const isInvite = !!prefilledCode;
  const isParentSignup = isInvite && signupRole === "parent";
  const isLogin = !isSignup;
  const [error, setError] = useState(oauthError);
  const [loading, setLoading] = useState(false);
  const [savedEmail, setSavedEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  });
  const [devLink, setDevLink] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setDevLink("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.code === "EMAIL_EXISTS") {
        const email = body.email || "";
        if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
        return setError("You already have an account with that email. Sign in with your password.");
      }
      if (data.code === "NO_ACCOUNT") {
        return setError(
          "No account with that email. Sign up at /signup (coaches) or use your coach's invite link (players or parents)."
        );
      }
      if (data.code === "WRONG_PASSWORD") {
        return setError("Wrong password. Use the same password you picked when you signed up, or reset it.");
      }
      if (data.code === "EMAIL_NOT_VERIFIED") {
        const email = data.email || body.email || "";
        if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        return;
      }
      return setError(data.error || "Something went wrong.");
    }
    if (body.email) localStorage.setItem(SAVED_EMAIL_KEY, body.email);
    if (data.needsVerification) {
      if (data.devVerifyLink) setDevLink(data.devVerifyLink);
      window.location.href = data.redirect || `/verify-email?email=${encodeURIComponent(body.email || "")}`;
      return;
    }
    // Full page load so the new session cookie is sent on the next request (fixes mobile/Safari).
    window.location.href = data.redirect || "/";
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
        {isInvite && (
          <div className="mb-4 rounded-md bg-blue-500 px-4 py-3 text-center text-white">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100">You&apos;re joining</div>
            <div className="mt-0.5 text-lg font-semibold">{teamName}</div>
          </div>
        )}

        <h1 className="text-lg font-semibold text-navy-900">
          {coachOnly ? "Create your team" : isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-5 mt-1 text-sm text-navy-500">
          {isParentSignup
            ? "Create a parent account to follow schedule, announcements, and team updates."
            : isInvite
              ? "Fill in your details to join this team."
              : coachOnly
                ? "Set up your own team. Share the invite link with your players."
                : signedOut
                  ? "You signed out. Your account is still saved — sign back in with the same email and password."
                  : resetOk
                    ? "Password updated. Sign in with your new password."
                    : "Sign in with the same email and password every time — your teams stay with your account."}
        </p>

        {signedOut && isLogin && (
          <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 ring-1 ring-blue-100">
            Your team and data are still here. Only your session ended.
          </div>
        )}

        {!isInvite && <div className="mb-4"><SocialAuthButtons mode={isSignup ? "signup" : "login"} /></div>}

        <form onSubmit={onSubmit} className="space-y-3.5" autoComplete={isSignup ? "on" : "on"}>
          {isSignup && (
            <>
              <div>
                <Label>Full name</Label>
                <Input name="name" required autoComplete="name" placeholder="Your name" />
              </div>

              {isInvite ? (
                <input type="hidden" name="role" value={isParentSignup ? "parent" : "player"} />
              ) : coachOnly ? (
                <>
                  <input type="hidden" name="role" value="coach" />
                  <div className="space-y-3">
                    <div>
                      <Label>Team name</Label>
                      <Input name="team_name" required autoComplete="organization" placeholder="e.g. Westfield Varsity" />
                    </div>
                    <div>
                      <Label>Team join code</Label>
                      <Input
                        name="team_code"
                        required
                        minLength={4}
                        maxLength={20}
                        autoComplete="off"
                        placeholder="e.g. WOLVES2025"
                        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                      />
                      <p className="mt-1 text-xs text-navy-400">
                        Players will use this in your invite link to join your team.
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                <p className="mt-1 text-xs text-navy-400">
                  We&apos;ll send a verification link. You&apos;ll use this email every time you sign back in.
                </p>
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>

              {isInvite && !isParentSignup && (
                <>
                  <div>
                    <Label>Team code</Label>
                    <Input
                      name="team_code"
                      required
                      minLength={4}
                      maxLength={20}
                      defaultValue={prefilledCode}
                      autoComplete="off"
                      placeholder="e.g. WOLVES2025"
                      style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Position</Label>
                      <select name="position" className="input" autoComplete="off">
                        <option value="">Select…</option>
                        {POSITIONS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Jersey #</Label>
                      <Input name="jersey_number" type="number" min="0" placeholder="7" autoComplete="off" />
                    </div>
                  </div>
                </>
              )}

              {isInvite && isParentSignup && (
                <div>
                  <Label>Team code</Label>
                  <Input
                    name="team_code"
                    required
                    minLength={4}
                    maxLength={20}
                    defaultValue={prefilledCode}
                    autoComplete="off"
                    placeholder="e.g. WOLVES2025"
                    style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                  />
                </div>
              )}
            </>
          )}

          {!isSignup && (
            <>
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={savedEmail}
                  onChange={(e) => setSavedEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <p className="mt-1.5 text-right text-xs">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800">
              <p>{error}</p>
              {error.includes("already have an account") && (
                <Link href="/login" className="mt-1 inline-block font-semibold underline">
                  Go to sign in →
                </Link>
              )}
            </div>
          )}

          {devLink && (
            <p className="break-all text-xs text-navy-500">
              Dev verify link:{" "}
              <a className="text-blue-600 underline" href={devLink}>
                {devLink}
              </a>
            </p>
          )}

          <Button disabled={loading} className="w-full">
            {loading
              ? "Please wait…"
              : isSignup
                ? isInvite
                  ? "Join team"
                  : coachOnly
                    ? "Create team"
                    : "Sign up"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-navy-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-blue-600">
            {isSignup ? "Sign in" : "Join or create a team"}
          </Link>
        </p>
        </CardContent>
      </Card>
    </div>
  );
}
