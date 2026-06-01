// Lightweight dependency-free SVG charts. Safe to use in server components.

const BLUES = ["#2563eb", "#0ea5e9", "#1e3a8a", "#22d3ee", "#60a5fa", "#1d4ed8"];

/** Horizontal bar chart. data: [{label, value}] */
export function BarChart({ data, color }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs font-medium text-navy-500">{d.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-50">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: color || `linear-gradient(90deg, ${BLUES[i % BLUES.length]}, #1e3a8a)`,
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-bold text-navy-800">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Smooth-ish area line chart. points: [{label, value}] */
export function LineChart({ points, height = 140, stroke = "#2563eb" }) {
  if (!points || points.length === 0)
    return <p className="text-sm text-navy-400">Not enough data yet.</p>;

  const W = 320;
  const H = height;
  const pad = 24;
  const values = points.map((p) => Number(p.value) || 0);
  const max = Math.max(1, ...values);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);

  // Single point — centered dot (polyline needs 2+ points to draw a visible line).
  if (points.length === 1) {
    const cx = W / 2;
    const cy = y(values[0]);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        <line x1={pad} y1={cy} x2={W - pad} y2={cy} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r="6" fill={stroke} />
        <text x={cx} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#64748b" }}>
          {points[0].label} · {values[0]} kills
        </text>
      </svg>
    );
  }

  const stepX = (W - pad * 2) / (points.length - 1);
  const x = (i) => pad + i * stepX;
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${x(points.length - 1)},${H - pad}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ maxHeight: H }}>
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lc)" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={stroke} strokeWidth="2" />
      ))}
    </svg>
  );
}

/** Win/Loss donut. */
export function RecordDonut({ wins, losses, size = 132 }) {
  const total = wins + losses;
  const pct = total ? wins / total : 0;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#fee2e2" strokeWidth="12" />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text x="50%" y="46%" textAnchor="middle" className="fill-navy-900" style={{ fontSize: 26, fontWeight: 800 }}>
        {total ? Math.round(pct * 100) : 0}%
      </text>
      <text x="50%" y="64%" textAnchor="middle" className="fill-navy-400" style={{ fontSize: 11, fontWeight: 600 }}>
        WIN RATE
      </text>
    </svg>
  );
}

/** Small inline progress ring (e.g. wellness score, completion). */
export function Ring({ value, max = 100, size = 64, color = "#2563eb", label }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const cx = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text x="50%" y="54%" textAnchor="middle" style={{ fontSize: size * 0.3, fontWeight: 800, fill: "#0d1730" }}>
        {label ?? value}
      </text>
    </svg>
  );
}
