import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import GroupChat from "@/components/GroupChat";
import { blockParent } from "@/lib/parentPages";
import { canUseGroupChat } from "@/lib/permissions";
import { chatEligibleUsers, listRoomsForUser } from "@/lib/chats";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  blockParent(user);
  if (!canUseGroupChat(user)) redirect("/");

  const rooms = listRoomsForUser(user.id);
  const roster = chatEligibleUsers(user.team_id);

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Team chat"
        title="Group Chats"
        subtitle="Create a group and invite coaches or players you want in the conversation."
      />
      <GroupChat user={user} initialRooms={rooms} roster={roster} />
    </NavShell>
  );
}
