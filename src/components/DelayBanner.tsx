import Link from "next/link";
import type { DelayResponse } from "@/contracts";
import { LineChip } from "./LineChip";
import { BoltIcon, ChevronIcon } from "./icons";

/** Floating "story-style" alert pill pinned to the top of every screen while a delay is active. */
export function DelayBanner({ delay }: { delay: DelayResponse }) {
  if (!delay.active) return null;

  return (
    <Link
      href="/hunt"
      className="paper"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(420px, calc(100vw - 24px))",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        padding: "6px 10px 6px 6px",
        borderLeft: "5px solid var(--hot)",
        boxShadow: "var(--shadow-float)",
        animation: "fade-in 240ms var(--ease-out)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: "var(--radius-chip)",
          background: "var(--hot)",
          color: "#fffaf0",
          boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.2)",
        }}
      >
        <BoltIcon size={20} weight={2.2} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>
        {delay.teamRouteIds.map((t) => (
          <LineChip key={t} teamRouteId={t} size="sm" label="short" />
        ))}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {delay.message ?? "Delay in progress"}
        </span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 13, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-display)" }}>
        Play
        <ChevronIcon size={16} weight={2.4} />
      </span>
    </Link>
  );
}
