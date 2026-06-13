import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        subtitle="Update your name and player details. Your login email stays the same."
      />
      <ProfileForm user={user} />
    </NavShell>
  );
}
