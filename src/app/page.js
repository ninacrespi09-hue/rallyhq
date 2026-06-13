import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForUser, isAllSportsUser } from "@/lib/userSportPreference";
import SportPicker from "@/components/SportPicker";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAllSportsUser(user)) redirect(homePathForUser(user));
  return <SportPicker userName={user.name} />;
}
