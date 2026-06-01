import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import StatSheetUpload from "@/components/StatSheetUpload";
import { getDb } from "@/lib/db";
import { blockParent } from "@/lib/parentPages";

export default async function StatSheetUploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  blockParent(user);
  if (user.role !== "coach") redirect("/stats");

  const roster = user.team_id
    ? getDb()
        .prepare(
          `SELECT id, name, jersey_number FROM users WHERE role = 'player' AND team_id = ? ORDER BY name`
        )
        .all(user.team_id)
    : [];

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Analytics"
        title="Upload Stat Sheet"
        subtitle="Scan a photo or enter stats manually, then review before saving."
      />
      <p className="mb-4 text-sm">
        <Link href="/stats" className="font-medium text-brand-600">
          ← Back to Team Stats
        </Link>
      </p>
      <StatSheetUpload roster={roster} />
    </NavShell>
  );
}
