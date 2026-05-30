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
 * A frame of evenly-spaced small volleyballs around the parent (which must be
 * position: relative). They follow the rounded corners and sit `outset` pixels
 * outside the parent's edge.
 */
export default function VolleyballFrame({
  radius = 42,
  size = 22,
  step = 96,
  outset = 12,
  ball = "#1e3a8a",
  seam = "#cfe8fb",
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
  let balls = null;
  if (w > 24 && h > 24) {
    const { segs, P } = buildSegments(w, h, radius);
    const n = Math.max(8, Math.round(P / step));
    const as = P / n;
    const sc = size / 24;
    balls = Array.from({ length: n }, (_, i) => {
      const [x, y] = pointAt(segs, i * as);
      const rot = (i * 53) % 360;
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc}) translate(-12 -12)`}>
          <circle cx="12" cy="12" r="11.5" fill={ball} />
          <g fill="none" stroke={seam} strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 1.5C8 6 8 12 12 12C16 12 16 18 12 22.5" />
            <path d="M3 8C8 10.5 16 10.5 21 8" />
            <path d="M3 16C8 13.5 16 13.5 21 16" />
          </g>
        </g>
      );
    });
  }

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute" style={{ inset: -outset }}>
      {w > 0 && (
        <svg width={w} height={h} className="overflow-visible">
          {balls}
        </svg>
      )}
    </div>
  );
}
