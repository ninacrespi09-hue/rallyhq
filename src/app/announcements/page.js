import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import Announcer from "@/components/Announcer";
import PageHeader from "@/components/PageHeader";

const CAT_STYLE = {
  announcement: { chip: "bg-brand-100 text-brand-700", icon: "📣", label: "Announcement" },
  exercise: { chip: "bg-emerald-100 text-emerald-700", icon: "💪", label: "Exercise" },
  info: { chip: "bg-sky-100 text-sky-700", icon: "ℹ️", label: "Info" },
};

export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const posts = getDb()
    .prepare(
      `SELECT a.*, u.name AS author FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE u.team_id = ? ORDER BY a.pinned DESC, a.created_at DESC LIMIT 50`
    )
    .all(user.team_id);

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Team board"
        title="Announcements"
        subtitle="Updates, drills, and important info from your coaches."
        action={user.role === "coach" ? <Announcer /> : null}
      />

      <div className="space-y-3">
        {posts.length === 0 && <p className="text-sm text-navy-400">Nothing posted yet.</p>}
        {posts.map((p) => {
          const c = CAT_STYLE[p.category] || CAT_STYLE.announcement;
          return (
            <article key={p.id} className="card">
              <div className="flex items-center gap-2">
                {p.pinned ? <span title="Pinned">📌</span> : null}
                <span className={`chip ${c.chip}`}>
                  {c.icon} {c.label}
                </span>
                <span className="ml-auto text-xs text-navy-400">{fmtDateTime(p.created_at)}</span>
              </div>
              <h2 className="mt-2 font-bold text-navy-900">{p.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-navy-600">{p.body}</p>
              <p className="mt-2 text-xs text-navy-400">— {p.author}</p>
            </article>
          );
        })}
      </div>
    </NavShell>
  );
}
