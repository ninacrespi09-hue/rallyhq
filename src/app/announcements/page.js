import { redirect } from "next/navigation";

/** Announcements UI removed from nav — redirect old links to home. Data kept in DB. */
export default function AnnouncementsPage() {
  redirect("/");
}
