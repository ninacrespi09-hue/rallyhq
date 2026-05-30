import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import CheckinForm from "@/components/CheckinForm";

export default async function CheckinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = date('now')")
    .get(user.id);

  const history = getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 14")
    .all(user.id);

  return (
    <NavShell user={user}>
      <h1 className="text-2xl font-extrabold text-slate-900">Daily check-in</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Takes 20 seconds. Helps your coach manage load and catch injuries early.
      </p>

      <CheckinForm existing={today} />

      <section className="mt-6 card">
        <h2 className="mb-3 font-bold text-slate-900">Last 14 days</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No check-ins yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="w-24 font-medium text-slate-600">{h.date}</span>
                <Bar label="Sore" value={h.soreness} invert />
                <Bar label="Energy" value={h.energy} />
                <Bar label="Mood" value={h.mood} />
                {h.injury ? <span className="chip bg-red-100 text-red-700">injury</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </NavShell>
  );
}

function Bar({ label, value, invert }) {
  // invert => higher is worse (soreness): show red when high
  const good = invert ? value <= 2 : value >= 4;
  const bad = invert ? value >= 4 : value <= 2;
  const color = good ? "bg-emerald-500" : bad ? "bg-red-400" : "bg-amber-400";
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        <span>{value}/5</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value * 20}%` }} />
      </div>
    </div>
  );
}
