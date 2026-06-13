import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import StatSheetUpload from "@/components/StatSheetUpload";
import { getDb } from "@/lib/db";
import { blockParent } from "@/lib/parentPages";

export default async function StatSheetUploadPage({ params, searchParams }) {
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
        title="Upload Stat Sheet"
        subtitle="Scan a photo or enter stats manually, then review before saving."
      />
      <p className="mb-4 text-sm">
        <Link href={sportPath(sport, "stats")} className="font-medium text-brand-600">
          ← Back to Team Stats
        </Link>
      </p>
      <StatSheetUpload roster={roster} />
    </NavShell>
  );
}
