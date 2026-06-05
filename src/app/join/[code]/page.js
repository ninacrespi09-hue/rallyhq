import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";

export default async function JoinPage({ params, searchParams }) {
  const { code } = await params;
  const { role } = await searchParams;
  const signupRole = role === "parent" ? "parent" : "player";

  const user = await getCurrentUser();
  if (user) redirect("/");

  const team = getDb()
    .prepare("SELECT name FROM teams WHERE code = ?")
    .get(code.toUpperCase());

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-200 to-sky-100 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center">
            <div className="text-4xl mb-3">🏐</div>
            <h1 className="text-lg font-bold text-navy-900">Invalid invite link</h1>
            <p className="mt-2 text-sm text-navy-500">This invite link is not valid. Ask your coach for a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthForm
      mode="signup"
      prefilledCode={code.toUpperCase()}
      teamName={team.name}
      signupRole={signupRole}
    />
  );
}
