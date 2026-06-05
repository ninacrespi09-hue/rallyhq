import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db";
import CheckinForm from "@/components/CheckinForm";
import PageHeader from "@/components/PageHeader";
import { blockParent } from "@/lib/parentPages";

export default async function CheckinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  blockParent(user);

  const today = getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = date('now')")
    .get(user.id);

  const history = getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 14")
    .all(user.id);

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Wellness"
        title="Daily check-in"
        subtitle="Takes 20 seconds. Helps your coach manage load and catch injuries early."
      />

      <CheckinForm existing={today} />

      <Card className="mt-6">
        <CardContent>
          <h2 className="mb-3 font-bold text-navy-900">Last 14 days</h2>
          {history.length === 0 ? (
            <p className="text-sm text-navy-400">No check-ins yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl bg-navy-50 px-3 py-2 text-sm">
                  <span className="w-24 font-medium text-navy-600">{h.date}</span>
                  <Bar label="Sore" value={h.soreness} invert />
                  <Bar label="Energy" value={h.energy} />
                  <Bar label="Mood" value={h.mood} />
                  {h.injury ? <Badge className="bg-blue-100 text-blue-700">injury</Badge> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </NavShell>
  );
}

function Bar({ label, value, invert }) {
  // invert => higher is worse (soreness): show red when high
  const good = invert ? value <= 2 : value >= 4;
  const bad = invert ? value >= 4 : value <= 2;
  const color = good ? "bg-emerald-500" : bad ? "bg-blue-400" : "bg-blue-400";
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-[10px] text-navy-400">
        <span>{label}</span>
        <span>{value}/5</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-navy-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value * 20}%` }} />
      </div>
    </div>
  );
}
