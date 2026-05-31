import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-2xl">🏐</span>
        <span className="text-2xl font-extrabold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <div className="w-full max-w-sm card text-center">
        <h1 className="text-lg font-bold text-navy-900">Join RallyHQ</h1>
        <p className="mt-2 text-sm text-navy-500">
          Players join through their coach&apos;s invite link. Coaches create their own separate team.
        </p>

        <div className="mt-6 space-y-3 text-left">
          <div className="rounded-xl bg-white/50 p-4 ring-1 ring-blue-200/60">
            <div className="text-sm font-bold text-navy-900">🏐 I&apos;m a player</div>
            <p className="mt-1 text-xs text-navy-500">
              Ask your coach for the team invite link — it looks like{" "}
              <span className="font-mono text-brand-700">/join/TEAMCODE</span>. You cannot join by typing a code here.
            </p>
          </div>

          <Link href="/signup/coach" className="btn-primary block w-full text-center">
            🏆 I&apos;m a coach — create my team
          </Link>
        </div>

        <p className="mt-5 text-sm text-navy-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
