import type { ComponentType } from "react";
import type { TokenLedgerEntry } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { BoltIcon, CoinIcon, HuntIcon, PerkIcon, RideIcon, StarIcon, type IconProps } from "@/components/icons";
import { KIND_COPY, kindOf, relativeTime, type ActivityKind } from "./activity";
import { glowVar } from "./team";
import s from "./me.module.css";

export function kindVisual(kind: ActivityKind, team: TeamRouteId): { Icon: ComponentType<IconProps>; color: string } {
  switch (kind) {
    case "ride":
      return { Icon: RideIcon, color: glowVar(team) };
    case "hunt":
      return { Icon: HuntIcon, color: "var(--hot)" };
    case "landmark":
      return { Icon: StarIcon, color: "var(--accent)" };
    case "perk":
      return { Icon: PerkIcon, color: "var(--glow-orange)" };
    default:
      return { Icon: BoltIcon, color: "var(--glow-blue)" };
  }
}

interface ActivityListProps {
  entries: TokenLedgerEntry[];
  team: TeamRouteId;
  now: number;
  empty: React.ReactNode;
}

/** Compact feed of token ledger entries, newest first. */
export function ActivityList({ entries, team, now, empty }: ActivityListProps) {
  if (!entries.length) return <>{empty}</>;
  const sorted = [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
      {sorted.map((e, i) => {
        const kind = kindOf(e.reason);
        const { Icon, color } = kindVisual(kind, team);
        const gain = e.delta >= 0;
        return (
          <li
            key={`${e.createdAt}-${e.reason}-${i}`}
            className={s.rise}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0" }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                flex: "none",
                width: 44,
                height: 44,
                borderRadius: 14,
                color,
                background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              }}
            >
              <Icon size={22} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{KIND_COPY[kind].title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>
                <time dateTime={e.createdAt}>{relativeTime(e.createdAt, now)}</time>
              </span>
            </span>
            <span
              className="num"
              aria-label={`${gain ? "plus" : "minus"} ${Math.abs(e.delta)} CitiTokens`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 17,
                fontWeight: 800,
                color: gain ? "var(--accent)" : "var(--muted)",
              }}
            >
              {gain ? "+" : "−"}
              {Math.abs(e.delta)}
              <CoinIcon size={16} weight={2.2} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
