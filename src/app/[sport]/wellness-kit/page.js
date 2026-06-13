import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import WellnessKit from "@/components/WellnessKit";
import { blockParent } from "@/lib/parentPages";
import { getDb } from "@/lib/db";

export default async function WellnessKitPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  blockParent(user);

  const suggestions = teamId
    ? getDb()
        .prepare(
          `SELECT s.id, s.suggestion, s.created_at, u.id AS user_id, u.name AS author_name
           FROM wellness_kit_suggestions s
           JOIN users u ON u.id = s.user_id
           WHERE u.team_id = ?
           ORDER BY s.created_at DESC`
        )
        .all(teamId)
    : [];

  const items = teamId
    ? getDb()
        .prepare(
          `SELECT id, item_name, quantity, sort_order, created_at, updated_at
           FROM wellness_kit_items
           WHERE team_id = ?
           ORDER BY sort_order ASC, id ASC`
        )
        .all(teamId)
    : [];

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Wellness"
        title="Wellness Kit"
        subtitle="See what's in the kit, and tell your coach what else you'd like — foam rollers, snacks, recovery tools, and more."
      />
      <WellnessKit user={user} initialSuggestions={suggestions} initialItems={items} />
    </NavShell>
  );
}
