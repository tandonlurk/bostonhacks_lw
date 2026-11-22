// Small presentational pieces for the Perks board: avatar badge, rubber stamp, paper token coin.
import type { TeamRouteId } from "@/contracts/routes";
import { CoinIcon } from "@/components/icons";
import { TEAM_INK, initials, teamFill } from "./format";
import s from "./market.module.css";

/** Round punched-paper avatar in the author's line color. */
export function Avatar({ handle, team, size = 30 }: { handle: string; team: TeamRouteId; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: teamFill(team),
        color: TEAM_INK[team],
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
        boxShadow: "0 0 0 2px var(--cream), 0 0 0 3px var(--paper-edge), 0 2px 3px var(--paper-lift-2)",
      }}
    >
      {initials(handle)}
    </span>
  );
}

export function Stamp({
  label,
  color,
  size = 13,
  rot = -8,
  slam = false,
  paper = true,
}: {
  label: string;
  color: string;
  size?: number;
  rot?: number;
  slam?: boolean;
  /** Multiply-blend like real ink on paper. */
  paper?: boolean;
}) {
  return (
    <span
      className={`${s.stamp} ${paper ? s.onPaper : ""} ${slam ? s.slam : ""}`}
      style={{ color, fontSize: size, transform: `rotate(${rot}deg)`, ["--stamp-rot" as string]: `${rot}deg` }}
    >
      {label}
    </span>
  );
}

/** Gold paper CitiToken coin: a punched disc with a folded rim. */
export function Coin({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at 34% 28%, rgba(255,250,240,0.55), transparent 46%), var(--gold)",
        color: "var(--ink)",
        boxShadow: "inset 0 0 0 1.5px rgba(133,96,15,0.65), inset 0 -2px 0 rgba(74,52,22,0.2), 0 1px 1px var(--paper-lift-2)",
      }}
    >
      <CoinIcon size={Math.round(size * 0.74)} weight={2.4} />
    </span>
  );
}
