import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import GroupChat from "@/components/GroupChat";
import { blockParent } from "@/lib/parentPages";
import { canUseGroupChat } from "@/lib/permissions";
import { chatEligibleUsers, listRoomsForUser } from "@/lib/chats";

export default async function ChatPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  blockParent(user);
  if (!canUseGroupChat(user)) redirect("/");

  const rooms = listRoomsForUser(user.id);
  const roster = chatEligibleUsers(teamId);

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Team chat"
        title="Group Chats"
        subtitle="Create a group and invite coaches or players you want in the conversation."
      />
      <GroupChat user={user} initialRooms={rooms} roster={roster} />
    </NavShell>
  );
}
