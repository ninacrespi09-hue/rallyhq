"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { POSITIONS } from "@/lib/format";

const SAVED_EMAIL_KEY = "rallyhq_email";

// coachOnly = coach creates a new team at /signup/coach
// prefilledCode = player/parent joins via /join/CODE invite link only
// signupRole = 'player' | 'parent' when joining via invite
export default function AuthForm({ mode, prefilledCode, teamName, coachOnly = false, signupRole = "player" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signedOut = searchParams.get("signedOut") === "1";
  const isSignup = mode === "signup";
  const isInvite = !!prefilledCode;
  const isParentSignup = isInvite && signupRole === "parent";
  const isLogin = !isSignup;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedEmail, setSavedEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.code === "EMAIL_EXISTS") {
        const email = body.email || "";
        if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
        return setError("You already have an account with that email. Sign in below with your password.");
      }
      if (data.code === "NO_ACCOUNT") {
        return setError(
          "No account with that email. Sign up at /signup/coach (coaches) or use your coach's invite link (players or parents)."
        );
      }
      if (data.code === "WRONG_PASSWORD") {
        return setError("Wrong password. Use the same password you picked when you signed up.");
      }
      return setError(data.error || "Something went wrong.");
    }
    if (body.email) localStorage.setItem(SAVED_EMAIL_KEY, body.email);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-2xl">🏐</span>
        <span className="text-2xl font-extrabold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <div className="w-full max-w-sm card">
        {isInvite && (
          <div className="mb-4 rounded-xl bg-blue-600 px-4 py-3 text-center text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">You&apos;re joining</div>
            <div className="mt-0.5 text-lg font-extrabold">{teamName}</div>
          </div>
        )}

        <h1 className="text-lg font-bold text-navy-900">
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
                  : savedEmail
                    ? "Sign in with your email and password."
                    : "Sign in with the same email you used when you joined."}
        </p>

        {signedOut && isLogin && (
          <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 ring-1 ring-blue-200">
            Your team and data are still here. Only your session ended.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5">
          {isSignup && (
            <>
              <div>
                <label className="label">Full name</label>
                <input name="name" required className="input" placeholder="Your name" />
              </div>

              {isInvite ? (
                <input type="hidden" name="role" value={isParentSignup ? "parent" : "player"} />
              ) : coachOnly ? (
                <>
                  <input type="hidden" name="role" value="coach" />
                  <div className="space-y-3">
                    <div>
                      <label className="label">Team name</label>
                      <input name="team_name" required className="input" placeholder="e.g. Westfield Varsity" />
                    </div>
                    <div>
                      <label className="label">Team join code</label>
                      <input
                        name="team_code"
                        required
                        minLength={4}
                        maxLength={20}
                        className="input"
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
                <label className="label">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                />
                <p className="mt-1 text-xs text-navy-400">You&apos;ll use this email every time you sign back in.</p>
              </div>
              <div>
                <label className="label">Password</label>
                <input name="password" type="password" required minLength={6} className="input" placeholder="••••••••" />
              </div>

              {isInvite && !isParentSignup && (
                <>
                  <div>
                    <label className="label">Team code</label>
                    <input
                      name="team_code"
                      required
                      minLength={4}
                      maxLength={20}
                      defaultValue={prefilledCode}
                      className="input"
                      placeholder="e.g. WOLVES2025"
                      style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Position</label>
                      <select name="position" className="input">
                        <option value="">Select…</option>
                        {POSITIONS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Jersey #</label>
                      <input name="jersey_number" type="number" min="0" className="input" placeholder="7" />
                    </div>
                  </div>
                </>
              )}

              {isInvite && isParentSignup && (
                <div>
                  <label className="label">Team code</label>
                  <input
                    name="team_code"
                    required
                    minLength={4}
                    maxLength={20}
                    defaultValue={prefilledCode}
                    className="input"
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
                <label className="label">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={savedEmail}
                  onChange={(e) => setSavedEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input name="password" type="password" required minLength={6} className="input" placeholder="••••••••" />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
              <p>{error}</p>
              {error.includes("already have an account") && (
                <Link href="/login" className="mt-1 inline-block font-semibold underline">
                  Go to sign in →
                </Link>
              )}
            </div>
          )}

          <button disabled={loading} className="btn-primary w-full">
            {loading
              ? "Please wait…"
              : isSignup
                ? isInvite
                  ? "Join team"
                  : coachOnly
                    ? "Create team"
                    : "Sign up"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-navy-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-blue-700">
            {isSignup ? "Sign in" : "Join or create a team"}
          </Link>
        </p>
      </div>
    </div>
  );
}
