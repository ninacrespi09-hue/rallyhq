import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import JoinTeamCode from "@/components/JoinTeamCode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-sky-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-2xl">🏐</span>
        <span className="text-2xl font-extrabold tracking-tight text-navy-900">RallyHQ</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="text-center">
          <h1 className="text-lg font-bold text-navy-900">Join RallyHQ</h1>
          <p className="mt-2 text-sm text-navy-500">
            Players and parents join with a team code. Coaches create their own separate team.
          </p>

          <div className="mt-6 space-y-3 text-left">
            <JoinTeamCode joinRole="player" />
            <JoinTeamCode joinRole="parent" />

            <Button asChild className="w-full">
              <Link href="/signup/coach">🏆 I&apos;m a coach — create my team</Link>
            </Button>
          </div>

          <p className="mt-5 text-sm text-navy-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-700">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
