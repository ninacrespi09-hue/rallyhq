import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import ScheduleUpload from "@/components/ScheduleUpload";

/** Coach upload page — same pattern as /stats/upload. */
export default async function ScheduleUploadPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  if (user.role !== "coach") redirect("/schedule");

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Calendar"
        title="Upload Schedule"
        subtitle="Scan a photo of your schedule and review events before saving."
      />
      <p className="mb-4 text-sm">
        <Link href={sportPath(sport, "schedule")} className="font-medium text-brand-600">
          ← Back to Schedule
        </Link>
      </p>
      <ScheduleUpload />
    </NavShell>
  );
}
