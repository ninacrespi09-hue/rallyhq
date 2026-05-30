"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POSITIONS } from "@/lib/format";

export default function AuthForm({ mode, prefilledCode, teamName }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const isInvite = !!prefilledCode; // came via /join/CODE link
  const [role, setRole] = useState("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!res.ok) return setError(data.error || "Something went wrong.");
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
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">You're joining</div>
            <div className="mt-0.5 text-lg font-extrabold">{teamName}</div>
          </div>
        )}

        <h1 className="text-lg font-bold text-navy-900">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-5 mt-1 text-sm text-navy-500">
          {isInvite ? "Fill in your details to join the team." : isSignup ? "Set up your team or join one." : "Sign in to your team."}
        </p>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {isSignup && (
            <>
              <div>
                <label className="label">Full name</label>
                <input name="name" required className="input" placeholder="Your name" />
              </div>

              {/* Hide role switcher and code field on invite links */}
              {isInvite ? (
                <>
                  <input type="hidden" name="role" value="player" />
                  <input type="hidden" name="team_code" value={prefilledCode} />
                </>
              ) : (
                <>
                  <div>
                    <label className="label">I am a…</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["player", "coach"].map((r) => (
                        <button type="button" key={r} onClick={() => setRole(r)}
                          className={`rounded-xl px-3 py-2.5 text-sm font-semibold capitalize ring-1 transition ${
                            role === r ? "bg-blue-600 text-white ring-blue-600" : "bg-white/60 text-navy-600 ring-navy-200"
                          }`}
                        >{r}</button>
                      ))}
                    </div>
                    <input type="hidden" name="role" value={role} />
                  </div>

                  {role === "coach" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="label">Team name</label>
                        <input name="team_name" required className="input" placeholder="e.g. Westfield Varsity" />
                      </div>
                      <div>
                        <label className="label">Team join code</label>
                        <input name="team_code" required minLength={4} maxLength={20} className="input"
                          placeholder="e.g. WOLVES2025"
                          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }} />
                        <p className="mt-1 text-xs text-navy-400">Pick a word your players will type to join.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="label">Team code</label>
                      <input name="team_code" required className="input" placeholder="Ask your coach for the code"
                        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }} />
                    </div>
                  )}
                </>
              )}

              {/* Position + jersey for players */}
              {(isInvite || role === "player") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Position</label>
                    <select name="position" className="input">
                      <option value="">Select…</option>
                      {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Jersey #</label>
                    <input name="jersey_number" type="number" min="0" className="input" placeholder="7" />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required minLength={6} className="input" placeholder="••••••••" />
          </div>

          {error && <p className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">{error}</p>}

          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait…" : isSignup ? (isInvite ? "Join team" : role === "coach" ? "Create team" : "Join team") : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-navy-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-blue-700">
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}
