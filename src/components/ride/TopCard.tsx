import type { RideState } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { PinIcon, RideIcon } from "@/components/icons";
import { RadarIcon, SignalIcon, TunnelIcon, WalkIcon } from "./rideIcons";
import { fill, glow, TEAM_ON } from "./util";
import { formatDistance } from "./geo";
import type { GpsState } from "./useRiderPosition";
import styles from "./ride.module.css";

interface TopCardProps {
  name: string | null;
  team: TeamRouteId | null;
  active: boolean;
  state: RideState | null;
  nearestName: string | null;
  nearestDistance: number | null;
  gpsState: GpsState;
  accuracy: number;
  onRequestGps: () => void;
  canRequestGps: boolean;
}

const STATE_META: Record<RideState | "idle", { label: string; color: string; Icon: typeof RideIcon; spin?: boolean }> = {
  idle: { label: "Not riding", color: "var(--muted)", Icon: WalkIcon },
  searching: { label: "Finding train", color: "var(--ink)", Icon: RadarIcon, spin: true },
  on_vehicle: { label: "On train", color: "var(--accent)", Icon: RideIcon },
  in_tunnel: { label: "In tunnel", color: "var(--glow-orange)", Icon: TunnelIcon },
  left: { label: "Off train", color: "var(--muted)", Icon: WalkIcon },
};

export function StateBadge({ active, state }: { active: boolean; state: RideState | null }) {
  const meta = STATE_META[active && state ? state : "idle"];
  const { Icon } = meta;
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 12px 0 9px",
        borderRadius: "var(--radius-pill)",
        background: "rgba(18,22,29,0.06)",
        border: "1px solid var(--glass-border)",
        color: meta.color,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span className={meta.spin ? styles.searchSpin : undefined} style={{ display: "grid" }}>
        <Icon size={18} weight={2.2} />
      </span>
      {meta.label}
    </span>
  );
}

export function TopCard(p: TopCardProps) {
  const initial = (p.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const gpsOn = p.gpsState === "on";
  return (
    <header
      className="glass"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 12px)",
        left: 12,
        right: 12,
        maxWidth: 520,
        margin: "0 auto",
        zIndex: 5,
        borderRadius: 24,
        padding: 10,
        boxShadow: "var(--shadow-float)",
        animation: "fade-in 300ms var(--ease-out)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: "50%",
            background: p.team ? fill(p.team) : "var(--surface-3)",
            color: p.team ? TEAM_ON[p.team] : "var(--ink)",
            boxShadow: p.team ? `0 0 0 2px var(--bg), 0 0 0 4px ${glow(p.team)}` : undefined,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 19,
          }}
        >
          {initial}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.name ?? "Rider"}
          </p>
          {p.team ? (
            <p style={{ fontSize: 12.5, fontWeight: 700, color: glow(p.team), lineHeight: 1.3 }}>{TEAMS[p.team].name} team</p>
          ) : null}
        </div>
        <StateBadge active={p.active} state={p.state} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--glass-border)",
        }}
      >
        <p style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: 14, color: "var(--muted)" }}>
          <PinIcon size={18} weight={2} style={{ flexShrink: 0, color: "#6aa6ff" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Near <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{p.nearestName ?? "the T"}</strong>
            {p.nearestDistance != null ? ` · ${formatDistance(p.nearestDistance)}` : ""}
          </span>
        </p>
        {gpsOn ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--glow-green)", flexShrink: 0 }}>
            <SignalIcon size={16} weight={2.2} />
            GPS ±{Math.round(p.accuracy)} m
          </span>
        ) : p.canRequestGps ? (
          <button
            type="button"
            onClick={p.onRequestGps}
            className={styles.press}
            style={{
              flexShrink: 0,
              minHeight: 44,
              padding: "0 12px",
              margin: "-12px 0",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--glass-border)",
              background: "rgba(18,22,29,0.06)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {p.gpsState === "locating" ? "Locating…" : "Use my location"}
          </button>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>
            {p.gpsState === "denied" ? "Location off · simulated spot" : "Simulated spot"}
          </span>
        )}
      </div>
    </header>
  );
}
