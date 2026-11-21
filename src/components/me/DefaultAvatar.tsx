import { useId } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { glowVar, initialsOf, lineVar } from "./team";

/**
 * Illustrated placeholder avatar: the rider's initials scribbled over a team-colored
 * doodle (a wobbly track with station dots, sparkles and loops). Not a stock silhouette.
 */
export function DefaultAvatar({ name, team, size }: { name: string; team: TeamRouteId; size: number }) {
  const gid = useId().replace(/:/g, "");
  const glow = glowVar(team);
  const fill = lineVar(team);
  const initials = initialsOf(name);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block", borderRadius: "50%" }}>
      <defs>
        <radialGradient id={`${gid}-bg`} cx="32%" cy="26%" r="85%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#07090d" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid}-bg)`} />
      <g fill="none" stroke={glow} strokeLinecap="round" strokeLinejoin="round" opacity="0.45" strokeWidth="2.2">
        {/* the line, hand-drawn across the face */}
        <path d="M-4 74c14-3 22-14 34-13 13 1 17 12 31 10 12-2 18-13 43-12" />
        <path d="M-4 78c14-3 22-14 34-13 13 1 17 12 31 10 12-2 18-13 43-12" strokeDasharray="0.1 5" />
        {/* loops and squiggles */}
        <path d="M10 22c4-6 11-5 11 0s-7 6-7 1 8-9 13-4" />
        <path d="M72 12c3 3 7 3 10 0s7-3 10 0" />
        <path d="M78 34c1.5 4 5 6 9 5" />
      </g>
      <g fill="#07090d" stroke={glow} strokeWidth="2.2" opacity="0.8">
        <circle cx="30" cy="61" r="3.2" />
        <circle cx="61" cy="71" r="3.2" />
        <circle cx="88" cy="61" r="3.2" />
      </g>
      <g stroke="#f4f5f2" strokeLinecap="round" strokeWidth="2" opacity="0.7">
        <path d="M84 21v6M81 24h6" />
        <path d="M17 46v4M15 48h4" />
      </g>
      <text
        x="50"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#f4f5f2"
        style={{ font: "800 38px var(--font-display)", letterSpacing: "-0.04em" }}
        transform="rotate(-6 50 50)"
      >
        {initials}
      </text>
      {/* marker underline under the initials */}
      <path
        d={initials.length > 1 ? "M30 72c9-3 25-4 40-1" : "M38 72c6-2 15-3 24-1"}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        transform="rotate(-6 50 50)"
      />
    </svg>
  );
}
