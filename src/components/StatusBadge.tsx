import type { RideState } from "@/contracts";
import { RideIcon } from "./icons";
import { RadarIcon, TunnelIcon, WalkIcon } from "./ride/rideIcons";

const META: Record<RideState, { label: string; Icon: typeof RideIcon; color: string }> = {
  searching: { label: "Searching", Icon: RadarIcon, color: "var(--muted)" },
  on_vehicle: { label: "On vehicle", Icon: RideIcon, color: "var(--glow-green)" },
  in_tunnel: { label: "In tunnel", Icon: TunnelIcon, color: "var(--line-orange-text)" },
  left: { label: "Left vehicle", Icon: WalkIcon, color: "var(--muted)" },
};

/** Ride state as a small paper tag: icon + words, never color alone. */
export function StatusBadge({ state }: { state: RideState }) {
  const { label, Icon, color } = META[state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px 3px 7px",
        borderRadius: "var(--radius-chip)",
        border: "1.5px solid currentColor",
        background: "var(--cream)",
        boxShadow: "0 2px 0 var(--fold-shadow)",
        color,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <Icon size={16} weight={2.2} />
      {label}
    </span>
  );
}
