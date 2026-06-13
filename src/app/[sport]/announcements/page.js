import { getSportPageContext } from "@/lib/sportPage";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import Announcer from "@/components/Announcer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db";
import { contentTeamExpr } from "@/lib/teamScope";
import { isCoach } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/format";

const CATEGORY_STYLE = {
  announcement: "bg-sky-100 text-sky-800",
  exercise: "bg-emerald-100 text-emerald-800",
  info: "bg-navy-100 text-navy-700",
};

export default async function AnnouncementsPage({ params }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);

  const items = teamId
    ? getDb()
        .prepare(
          `SELECT a.*, u.name AS author_name
           FROM announcements a
           JOIN users u ON u.id = a.author_id
           WHERE ${contentTeamExpr("a", "author_id")} = ?
           ORDER BY a.pinned DESC, a.created_at DESC
           LIMIT 50`
        )
        .all(teamId)
    : [];

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Team updates"
        title="Announcements"
        subtitle="Practices, travel info, and coach notes for this team."
        action={isCoach(user) ? <Announcer /> : null}
      />

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-navy-400">No announcements yet.</CardContent>
          </Card>
        ) : (
          items.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-navy-900">{a.title}</h2>
                  <Badge className={CATEGORY_STYLE[a.category] || CATEGORY_STYLE.info}>
                    {a.category}
                  </Badge>
                  {a.pinned ? <Badge className="bg-amber-100 text-amber-800">Pinned</Badge> : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-navy-600">{a.body}</p>
                <p className="text-xs text-navy-400">
                  {a.author_name} · {fmtDateTime(a.created_at)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </NavShell>
  );
}
