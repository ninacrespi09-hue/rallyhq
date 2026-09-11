"use client";

import { useEffect, useState } from "react";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.3H12z"
      />
      <path fill="#34A853" d="M3.2 7.1 6.2 9.3C7 7.4 9.3 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 8.2 2.8 4.9 5 3.2 7.1z" />
      <path fill="#4A90E2" d="M12 21.2c2.5 0 4.6-.8 6.1-2.3l-2.9-2.3c-.8.6-1.9 1-3.2 1-3.5 0-6.5-2.4-7.5-5.6l-3 2.3C3.3 18.1 7.3 21.2 12 21.2z" />
      <path fill="#FBBC05" d="M4.5 12c0-.7.1-1.4.3-2L1.8 7.7C1.3 9 1 10.4 1 12s.3 3 1 4.3l3-2.3c-.2-.6-.3-1.3-.3-2z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.8zM14.3 6.4c.6-.7 1-1.7.9-2.7-1 .1-2.1.7-2.7 1.5-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.7-1.5z" />
    </svg>
  );
}

/**
 * Professional social login buttons. Hidden providers stay available in the UI
 * but show a clear message when env credentials are not configured yet.
 */
export default function SocialAuthButtons({ mode = "login" }) {
  const [providers, setProviders] = useState({ google: false, apple: false });

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => {});
  }, []);

  const label = mode === "signup" ? "Continue with" : "Continue with";

  return (
    <div className="space-y-2.5">
      <a
        href="/api/auth/google"
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-white text-sm font-medium text-navy-800 transition hover:bg-navy-50"
      >
        <GoogleIcon />
        {label} Google
      </a>
      <a
        href="/api/auth/apple"
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-navy-900 bg-navy-900 text-sm font-medium text-white transition hover:bg-navy-800"
      >
        <AppleIcon />
        {label} Apple
      </a>
      {!providers.google && !providers.apple ? (
        <p className="text-center text-[11px] text-navy-400">
          Social login activates after Google/Apple keys are added on the server.
        </p>
      ) : null}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-navy-400">or continue with email</span>
        </div>
      </div>
    </div>
  );
}
