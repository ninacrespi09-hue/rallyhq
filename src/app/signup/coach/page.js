import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function CoachSignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  redirect("/signup");
}
