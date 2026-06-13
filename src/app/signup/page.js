import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SignupWizard from "@/components/SignupWizard";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <SignupWizard />;
}
