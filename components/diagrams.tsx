import type { Side } from "@/lib/schemas";

/**
 * Line drawings in the brand blue. Two kinds:
 *  - ElevationGlyph: what each side of a house looks like (used in the 4-pane window motif)
 *  - PlanDiagram: top view showing where to stand for each photo (used in the photo step)
 */

const STROKE = "var(--color-blue)";

export function ElevationGlyph({ side, className }: { side: Side; className?: string }) {
  const gable = side === "left" || side === "right";
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true" fill="none" stroke={STROKE} strokeWidth="3" strokeLinejoin="round">
      {gable ? (
        <>
          {/* gable end: narrow wall with a pointed roof */}
          <path d="M30 40 L60 14 L90 40" />
          <rect x="34" y="40" width="52" height="40" />
          <rect x={side === "left" ? 44 : 62} y="50" width="14" height="14" />
          <line x1="22" y1="80" x2="98" y2="80" />
        </>
      ) : (
        <>
          {/* long wall with a pitched roof */}
          <path d="M10 38 L30 16 L90 16 L110 38" />
          <rect x="16" y="38" width="88" height="42" />
          {side === "front" ? (
            <>
              <rect x="26" y="48" width="16" height="14" />
              <rect x="78" y="48" width="16" height="14" />
              <rect x="53" y="54" width="14" height="26" />
            </>
          ) : (
            <>
              <rect x="26" y="48" width="16" height="14" />
              {/* patio door: two panes */}
              <rect x="58" y="50" width="32" height="30" />
              <line x1="74" y1="50" x2="74" y2="80" />
            </>
          )}
          <line x1="4" y1="80" x2="116" y2="80" />
        </>
      )}
    </svg>
  );
}

/** Where the camera stands (cx, cy) and which wall it faces, in a 200×200 top view. */
const PLAN: Record<Side, { wall: [number, number, number, number]; you: [number, number] }> = {
  front: { wall: [60, 135, 140, 135], you: [100, 172] },
  back: { wall: [60, 65, 140, 65], you: [100, 26] },
  left: { wall: [60, 65, 60, 135], you: [22, 100] },
  right: { wall: [140, 65, 140, 135], you: [178, 100] },
};

export function PlanDiagram({
  side,
  label,
  streetLabel,
  youLabel,
  className,
}: {
  side: Side;
  label: string;
  streetLabel: string;
  youLabel: string;
  className?: string;
}) {
  const { wall, you } = PLAN[side];
  const [x1, y1, x2, y2] = wall;
  return (
    <svg viewBox="0 0 200 210" className={className} role="img" aria-label={label}>
      {/* street along the front */}
      <rect x="0" y="186" width="200" height="24" fill="var(--color-glass-strong)" />
      <text x="100" y="202" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-ink-soft)">
        {streetLabel}
      </text>
      {/* house footprint */}
      <rect x="60" y="65" width="80" height="70" fill="var(--color-glass)" stroke="var(--color-ink-soft)" strokeWidth="2" />
      {/* view cone from the camera to the wall */}
      <polygon points={`${you[0]},${you[1]} ${x1},${y1} ${x2},${y2}`} fill={STROKE} opacity="0.12" />
      <line x1={you[0]} y1={you[1]} x2={(x1 + x2) / 2} y2={(y1 + y2) / 2} stroke={STROKE} strokeWidth="1.5" strokeDasharray="4 4" />
      {/* the wall to photograph */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="7" strokeLinecap="round" />
      {/* the customer */}
      <circle cx={you[0]} cy={you[1]} r="11" fill={STROKE} />
      <circle cx={you[0]} cy={you[1]} r="4" fill="var(--color-paper)" />
      <text
        x={side === "front" ? you[0] + 17 : you[0]}
        y={side === "front" ? you[1] + 4 : side === "back" ? you[1] - 16 : you[1] + 26}
        textAnchor={side === "front" ? "start" : "middle"}
        fontSize="11"
        fontWeight="700"
        fill={STROKE}
      >
        {youLabel}
      </text>
    </svg>
  );
}
