"use client";

import { useEffect, useRef, useState } from "react";

// Build the eight segments (4 straight edges + 4 corner arcs) of a rounded rect.
function buildSegments(w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const s = w - 2 * r;
  const v = h - 2 * r;
  const a = (r * Math.PI) / 2;
  const segs = [
    { len: s, at: (d) => [r + d, 0] },
    { len: a, at: (d) => { const t = -Math.PI / 2 + d / r; return [w - r + r * Math.cos(t), r + r * Math.sin(t)]; } },
    { len: v, at: (d) => [w, r + d] },
    { len: a, at: (d) => { const t = d / r; return [w - r + r * Math.cos(t), h - r + r * Math.sin(t)]; } },
    { len: s, at: (d) => [w - r - d, h] },
    { len: a, at: (d) => { const t = Math.PI / 2 + d / r; return [r + r * Math.cos(t), h - r + r * Math.sin(t)]; } },
    { len: v, at: (d) => [0, h - r - d] },
    { len: a, at: (d) => { const t = Math.PI + d / r; return [r + r * Math.cos(t), r + r * Math.sin(t)]; } },
  ];
  const P = segs.reduce((acc, x) => acc + x.len, 0);
  return { segs, P };
}

function pointAt(segs, t) {
  let d = t;
  for (const seg of segs) {
    if (d <= seg.len) return seg.at(d);
    d -= seg.len;
  }
  const last = segs[segs.length - 1];
  return last.at(last.len);
}

/**
 * A frame of evenly-spaced blue flowers around the parent (which must be
 * position: relative). Flowers follow the rounded corners and sit `outset`
 * pixels outside the parent's edge.
 */
export default function FlowerFrame({
  radius = 42,
  size = 28,
  step = 92,
  outset = 10,
  petal = "#2563eb",
  petalAlt = "#60a5fa",
  center = "#dbeafe",
}) {
  const ref = useRef(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setDim({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = dim;
  let flowers = null;
  if (w > 24 && h > 24) {
    const { segs, P } = buildSegments(w, h, radius);
    const n = Math.max(8, Math.round(P / step));
    const as = P / n;
    const pd = size * 0.27;
    const pr = size * 0.23;
    const cr = size * 0.17;
    flowers = Array.from({ length: n }, (_, i) => {
      const [x, y] = pointAt(segs, i * as);
      const fill = i % 2 ? petalAlt : petal;
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${(i * 47) % 360})`}>
          {[0, 1, 2, 3, 4].map((p) => {
            const ang = (p * 72 * Math.PI) / 180;
            return <circle key={p} cx={Math.cos(ang) * pd} cy={Math.sin(ang) * pd} r={pr} fill={fill} />;
          })}
          <circle r={cr} fill={center} />
        </g>
      );
    });
  }

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute" style={{ inset: -outset }}>
      {w > 0 && (
        <svg width={w} height={h} className="overflow-visible">
          {flowers}
        </svg>
      )}
    </div>
  );
}
