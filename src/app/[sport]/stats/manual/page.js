import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import StatSheetUpload from "@/components/StatSheetUpload";
import { getDb } from "@/lib/db";
import { blockParent } from "@/lib/parentPages";

/** Coach manual stat entry — same review table as photo upload. */
export default async function StatSheetManualPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  blockParent(user);
  if (user.role !== "coach") redirect("/stats");

  const roster = teamId
    ? getDb()
        .prepare(
          `SELECT id, name, jersey_number FROM users WHERE role = 'player' AND team_id = ? ORDER BY name`
        )
        .all(teamId)
    : [];

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Analytics"
        title="Enter Stats Manually"
        subtitle="Fill in match and player stats, then save to the team dashboard."
      />
      <p className="mb-4 text-sm">
        <Link href={sportPath(sport, "stats")} className="font-medium text-brand-600">
          ← Back to Team Stats
        </Link>
      </p>
      <StatSheetUpload roster={roster} manualOnly />
    </NavShell>
  );
}
