import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SportPicker from "@/components/SportPicker";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <SportPicker userName={user.name} />;
}
