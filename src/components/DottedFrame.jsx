// A dotted "court line" frame drawn with an SVG stroke so the dots are
// perfectly round, evenly spaced, and sit right on the edge. Sizing and
// spacing are fully controllable (unlike CSS border-style: dotted).
export default function DottedFrame({ radius = 30, dot = 7, gap = 26, outset = 0, color = "#1e3a8a", className = "" }) {
  // Positive `outset` pushes the dot ring outward, past the content box edge.
  const offset = dot / 2 - outset;
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute overflow-visible ${className}`}
      style={{
        top: offset,
        left: offset,
        width: `calc(100% - ${dot - 2 * outset}px)`,
        height: `calc(100% - ${dot - 2 * outset}px)`,
      }}
    >
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={radius}
        ry={radius}
        fill="none"
        stroke={color}
        strokeWidth={dot}
        strokeLinecap="round"
        strokeDasharray={`0 ${gap}`}
      />
    </svg>
  );
}
