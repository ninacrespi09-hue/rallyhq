"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { SIGNUP_OPTIONS, SPORT_PREF_ALL } from "@/lib/userSportPreference";
import { getPositionsForSport } from "@/lib/sports";
import { SportGlyph } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialAuthButtons from "@/components/SocialAuthButtons";

export default function SignupWizard() {
  const [step, setStep] = useState("choose");
  const [option, setOption] = useState(null);
  const [allRole, setAllRole] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function pickOption(opt) {
    setOption(opt);
    setError("");
    if (opt.sport === SPORT_PREF_ALL) {
      setStep("all-role");
      return;
    }
    setStep(opt.role === "coach" ? "coach-form" : "join-form");
  }

  function pickAllRole(role) {
    setAllRole(role);
    setStep(role === "coach" ? "coach-form" : "join-form");
  }

  const activeSport = option?.sport === SPORT_PREF_ALL ? null : option?.sport;
  const activeRole = option?.sport === SPORT_PREF_ALL ? allRole : option?.role;
  const sportPreference = option?.sport === SPORT_PREF_ALL ? SPORT_PREF_ALL : option?.sport;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.code === "EMAIL_EXISTS") {
        return setError("An account with that email already exists. Sign in instead.");
      }
      if (
        data.code === "EMAIL_NOT_VERIFIED" ||
        data.code === "EMAIL_NOT_CONFIGURED" ||
        data.code === "EMAIL_SEND_FAILED"
      ) {
        window.location.href =
          data.redirect ||
          `/verify-email?email=${encodeURIComponent(body.email || "")}${
            data.code === "EMAIL_NOT_CONFIGURED" || data.code === "EMAIL_SEND_FAILED" ? "&mailError=1" : ""
          }`;
        return;
      }
      return setError(data.error || "Something went wrong.");
    }
    // New signup or existing unverified account → go verify (resend already triggered server-side).
    if (data.needsVerification) {
      window.location.href = data.redirect || `/verify-email?email=${encodeURIComponent(body.email || "")}`;
      return;
    }
    window.location.href = data.redirect || "/";
  }

  const positions = activeSport ? getPositionsForSport(activeSport) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-500 text-white">
          <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="text-xl font-semibold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <Card className="w-full max-w-lg">
        <CardContent className="p-5">
          {step === "choose" && (
            <>
              <h1 className="text-lg font-bold text-navy-900">Join RallyHQ</h1>
              <p className="mt-1 text-sm text-navy-500">Choose how you&apos;ll use RallyHQ.</p>
              <div className="mt-4 mb-4">
                <SocialAuthButtons mode="signup" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SIGNUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickOption(opt)}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-white px-4 py-3 text-left transition hover:border-brand-100 hover:bg-brand-50/30"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-navy-50 text-navy-700 ring-1 ring-border">
                      {opt.sport === SPORT_PREF_ALL ? (
                        <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <SportGlyph sport={opt.sport} className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-sm font-medium text-navy-800">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "all-role" && (
            <>
              <h1 className="text-lg font-bold text-navy-900">All Sports</h1>
              <p className="mt-1 text-sm text-navy-500">How are you joining RallyHQ?</p>
              <div className="mt-4 space-y-2">
                {[
                  { role: "coach", label: "I'm a coach" },
                  { role: "player", label: "I'm a player" },
                  { role: "parent", label: "I'm a parent" },
                ].map((r) => (
                  <Button key={r.role} type="button" variant="outline" className="w-full justify-start" onClick={() => pickAllRole(r.role)}>
                    {r.label}
                  </Button>
                ))}
              </div>
              <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => setStep("choose")}>
                ← Back
              </Button>
            </>
          )}

          {(step === "coach-form" || step === "join-form") && (
            <>
              <h1 className="text-lg font-bold text-navy-900">
                {activeRole === "coach" ? "Create your team" : activeRole === "parent" ? "Parent account" : "Player account"}
              </h1>
              <p className="mt-1 text-sm text-navy-500">
                {option?.label || "All Sports"}
                {activeSport ? ` · ${activeSport}` : ""}
              </p>

              <form onSubmit={submit} className="mt-4 space-y-3">
                <input type="hidden" name="role" value={activeRole} />
                <input type="hidden" name="sport" value={activeSport || "volleyball"} />
                <input type="hidden" name="sport_preference" value={sportPreference} />

                <div>
                  <Label>Full name</Label>
                  <Input name="name" required autoComplete="name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" required autoComplete="email" />
                  <p className="mt-1 text-xs text-navy-400">We&apos;ll verify this address, then you can sign in with it anytime.</p>
                </div>
                <div>
                  <Label>Password</Label>
                  <Input name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>

                {activeRole === "coach" && (
                  <>
                    <div>
                      <Label>Team name</Label>
                      <Input name="team_name" required />
                    </div>
                    <div>
                      <Label>Team join code</Label>
                      <Input name="team_code" required minLength={4} style={{ textTransform: "uppercase" }} />
                    </div>
                  </>
                )}

                {activeRole !== "coach" && (
                  <div>
                    <Label>Team code</Label>
                    <Input name="team_code" required minLength={4} style={{ textTransform: "uppercase" }} />
                    <p className="mt-1 text-xs text-navy-400">Ask your coach for your team&apos;s join code.</p>
                  </div>
                )}

                {activeRole === "player" && activeSport && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Position</Label>
                      <select name="position" className="input">
                        <option value="">Select…</option>
                        {positions.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Jersey #</Label>
                      <Input name="jersey_number" type="number" min="0" />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-blue-700">{error}</p>}

                <Button disabled={loading} className="w-full">
                  {loading ? "Please wait…" : activeRole === "coach" ? "Create team" : "Create account"}
                </Button>
              </form>

              <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => setStep(option?.sport === SPORT_PREF_ALL ? "all-role" : "choose")}>
                ← Back
              </Button>
            </>
          )}

          <p className="mt-5 text-center text-sm text-navy-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
