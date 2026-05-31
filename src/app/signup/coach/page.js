import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function CoachSignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <AuthForm mode="signup" coachOnly />;
}
