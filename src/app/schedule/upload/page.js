import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import ScheduleUpload from "@/components/ScheduleUpload";

/** Coach upload page — same pattern as /stats/upload. */
export default async function ScheduleUploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "coach") redirect("/schedule");

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Calendar"
        title="Upload Schedule"
        subtitle="Scan a photo of your schedule and review events before saving."
      />
      <p className="mb-4 text-sm">
        <Link href="/schedule" className="font-medium text-brand-600">
          ← Back to Schedule
        </Link>
      </p>
      <ScheduleUpload />
    </NavShell>
  );
}
