// Small presentational pieces for the Perks tab: avatar, thumbtack, rubber stamp, coin token.
import type { TeamRouteId } from "@/contracts/routes";
import { CoinIcon } from "@/components/icons";
import { TEAM_INK, initials, teamFill } from "./format";
import s from "./market.module.css";

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
        boxShadow: "0 0 0 2px rgba(255,255,255,0.75), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {initials(handle)}
    </span>
  );
}

/** Hand-drawn thumbtack, head tinted with the poster's line color. */
export function Thumbtack({ color }: { color: string }) {
  return (
    <svg className={s.pin} width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
      <path d="M13.2 17.6c-.2 3.4-.3 6.9-.5 10.4" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d="M13 2.2c5.4-.1 9.4 3.4 9.3 7.9-.1 4.4-4.2 7.8-9.5 7.8-5.2 0-9.2-3.6-9.1-8 .1-4.3 4.1-7.6 9.3-7.7Z"
        fill={color}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="1.4"
      />
      <path d="M8.4 7.2c.9-1.6 2.6-2.6 4.6-2.7" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
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
  /** Multiply-blend like real ink; turn off on dark surfaces. */
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

/** Lime token coin used in buttons and counters. */
export function Coin({ size = 22, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={spin ? s.coinSpin : undefined}
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.6), transparent 42%), var(--accent)",
        color: "var(--accent-ink)",
        boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 0 1.5px #11140a",
      }}
    >
      <CoinIcon size={Math.round(size * 0.78)} weight={2.4} />
    </span>
  );
}
