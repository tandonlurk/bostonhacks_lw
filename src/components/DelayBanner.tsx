import Link from "next/link";
import type { DelayResponse } from "@/contracts";
import { LineChip } from "./LineChip";

export function DelayBanner({ delay }: { delay: DelayResponse }) {
  if (!delay.active) return null;

  return (
    <Link
      href="/hunt"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "var(--space-3) var(--space-4)",
        background: "var(--line-orange)",
        color: "#fff",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
        <span aria-hidden="true">⚠️</span>
        {delay.teamRouteIds.map((t) => (
          <LineChip key={t} teamRouteId={t} size="sm" label="short" />
        ))}
        {delay.message ?? "Delay in progress"}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>Find a hunt →</span>
    </Link>
  );
}
