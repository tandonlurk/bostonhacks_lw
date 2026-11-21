import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import type { LotTier } from "@/contracts";

/**
 * Inline mirrors of public/city/tiles/tier-N.svg and public/city/motifs/*.svg
 * (see docs/design.md section 4) — inlined so `currentColor` tints from CSS
 * `color` on the wrapping element, which an <img src> can't do per-instance.
 */
function TierShape({ tier }: { tier: LotTier }) {
  switch (tier) {
    case 0:
      return (
        <>
          <rect x="10" y="60" width="44" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
          <circle cx="32" cy="66" r="2" fill="currentColor" opacity="0.5" />
        </>
      );
    case 1:
      return (
        <>
          <rect x="16" y="58" width="32" height="14" rx="1" fill="currentColor" />
          <rect x="21" y="63" width="5" height="5" fill="#fff" opacity="0.35" />
          <rect x="38" y="63" width="5" height="5" fill="#fff" opacity="0.35" />
        </>
      );
    case 2:
      return (
        <>
          <rect x="14" y="46" width="36" height="26" rx="1" fill="currentColor" />
          {[52, 61].map((y) =>
            [19, 30, 41].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill="#fff" opacity="0.35" />),
          )}
        </>
      );
    case 3:
      return (
        <>
          <rect x="18" y="34" width="28" height="38" rx="1" fill="currentColor" />
          {[40, 48, 56].map((y) =>
            [22, 30, 38].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#fff" opacity="0.35" />),
          )}
        </>
      );
    case 4:
      return (
        <>
          <rect x="20" y="18" width="24" height="54" rx="1" fill="currentColor" />
          {[24, 32, 40, 48, 56].map((y) =>
            [24, 32].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#fff" opacity="0.35" />),
          )}
        </>
      );
    case 5:
      return (
        <>
          <rect x="26" y="20" width="12" height="52" fill="currentColor" opacity="0.85" />
          <rect x="16" y="30" width="32" height="42" rx="1" fill="currentColor" />
          {[36, 44, 52, 60].map((y) =>
            [20, 29, 38].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#fff" opacity="0.4" />),
          )}
        </>
      );
  }
}

function Motif({ team }: { team: TeamRouteId }) {
  switch (team) {
    case "Red":
      return (
        <g stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="32" y1="4" x2="32" y2="20" />
          <line x1="27" y1="9" x2="37" y2="9" />
          <line x1="28" y1="14" x2="36" y2="14" />
          <circle cx="32" cy="4" r="1.5" fill="currentColor" stroke="none" />
        </g>
      );
    case "Orange":
      return (
        <g fill="currentColor">
          <rect x="18" y="12" width="28" height="4" />
          <rect x="21" y="16" width="4" height="6" />
          <rect x="30" y="16" width="4" height="6" />
          <rect x="39" y="16" width="4" height="6" />
          <path d="M22 12 L32 4 L42 12 Z" opacity="0.85" />
        </g>
      );
    case "Blue":
      return (
        <g stroke="currentColor" fill="currentColor">
          <line x1="24" y1="20" x2="24" y2="6" strokeWidth="2" />
          <line x1="24" y1="6" x2="46" y2="6" strokeWidth="2" />
          <line x1="24" y1="6" x2="16" y2="12" strokeWidth="2" />
          <line x1="40" y1="6" x2="40" y2="14" strokeWidth="1.5" />
          <circle cx="40" cy="15" r="1.5" />
        </g>
      );
    case "Green":
      return (
        <g fill="currentColor">
          <rect x="27" y="12" width="10" height="8" />
          <circle cx="32" cy="16" r="2.5" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
          <path d="M27 12 L32 3 L37 12 Z" />
        </g>
      );
    case "Silver":
      return (
        <g>
          <rect x="20" y="4" width="24" height="16" fill="currentColor" opacity="0.9" />
          <g stroke="#fff" strokeWidth="0.75" opacity="0.5">
            <line x1="26" y1="4" x2="26" y2="20" />
            <line x1="32" y1="4" x2="32" y2="20" />
            <line x1="38" y1="4" x2="38" y2="20" />
            <line x1="20" y1="9" x2="44" y2="9" />
            <line x1="20" y1="14" x2="44" y2="14" />
          </g>
        </g>
      );
  }
}

interface BuildingTileProps {
  team: TeamRouteId;
  tier: LotTier;
  points: number;
  kind: string;
}

export function BuildingTile({ team, tier, points, kind }: BuildingTileProps) {
  return (
    <div
      key={tier}
      title={`${kind} · tier ${tier} · ${points} pts`}
      className="city-tile"
      style={{ color: TEAMS[team].color, width: "100%", aspectRatio: "64 / 80" }}
    >
      <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true">
        <rect x="6" y="72" width="52" height="4" fill="currentColor" opacity="0.25" />
        <TierShape tier={tier} />
        {tier >= 4 ? <Motif team={team} /> : null}
      </svg>
    </div>
  );
}
