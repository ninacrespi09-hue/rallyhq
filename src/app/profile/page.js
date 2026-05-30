import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <NavShell user={user}>
      <h1 className="text-2xl font-extrabold text-slate-900">My profile</h1>
      <p className="mb-5 mt-1 text-sm capitalize text-slate-500">
        {user.role} · {user.email}
      </p>
      <ProfileForm user={user} />
    </NavShell>
  );
}
