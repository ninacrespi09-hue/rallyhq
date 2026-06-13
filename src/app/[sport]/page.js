import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SportHome from "@/components/SportHome";
import { isSportId } from "@/lib/sports";

export default async function SportHubPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { sport } = await params;
  if (!isSportId(sport)) notFound();
  return <SportHome user={user} sport={sport} />;
}
