import type { RideState } from "@/contracts";

const META: Record<RideState, { label: string; icon: string; color: string }> = {
  searching: { label: "Searching", icon: "🔍", color: "var(--muted)" },
  on_vehicle: { label: "On vehicle", icon: "🚆", color: "var(--line-green)" },
  in_tunnel: { label: "In tunnel", icon: "🚇", color: "var(--line-orange)" },
  left: { label: "Left vehicle", icon: "🚶", color: "var(--muted)" },
};

export function StatusBadge({ state }: { state: RideState }) {
  const meta = META[state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border)",
        color: meta.color,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
