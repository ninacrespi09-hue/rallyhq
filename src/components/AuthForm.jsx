"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POSITIONS } from "@/lib/format";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isSignup = mode === "signup";
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
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-navy-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-2xl">🏐</span>
        <span className="text-2xl font-extrabold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <div className="w-full max-w-sm card">
        <h1 className="text-lg font-bold text-navy-900">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-5 mt-1 text-sm text-navy-500">
          {isSignup ? "Join your volleyball team in seconds." : "Sign in to your team."}
        </p>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {isSignup && (
            <>
              <div>
                <label className="label">Full name</label>
                <input name="name" required className="input" placeholder="Alex Rivera" />
              </div>

              <div>
                <label className="label">I am a…</label>
                <div className="grid grid-cols-2 gap-2">
                  {["player", "coach"].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold capitalize ring-1 transition ${
                        role === r
                          ? "bg-brand-600 text-white ring-brand-600"
                          : "bg-white text-navy-600 ring-navy-100"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="role" value={role} />
              </div>

              {role === "player" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Position</label>
                    <select name="position" className="input" defaultValue="Outside Hitter">
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
              )}
            </>
          )}

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="you@team.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required minLength={6} className="input" placeholder="••••••••" />
          </div>

          {error && <p className="text-sm font-medium text-blue-600">{error}</p>}

          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-navy-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-brand-600">
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>

      {!isSignup && (
        <p className="mt-5 max-w-sm text-center text-xs text-navy-400">
          Demo logins · coach: <b>coach@rallyhq.dev</b> · player: <b>maya@rallyhq.dev</b> · password{" "}
          <b>password123</b>
        </p>
      )}
    </div>
  );
}
