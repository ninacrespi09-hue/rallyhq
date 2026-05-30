import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import ProfileForm from "@/components/ProfileForm";
import PageHeader from "@/components/PageHeader";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <NavShell user={user}>
      <PageHeader eyebrow="Account" title="My profile" subtitle={`${user.role} · ${user.email}`} />
      <ProfileForm user={user} />
    </NavShell>
  );
}
