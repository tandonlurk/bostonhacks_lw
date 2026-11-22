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

/** Token ledger entries as a torn paper receipt, newest first. */
export function ActivityList({ entries, team, now, empty }: ActivityListProps) {
  if (!entries.length) return <>{empty}</>;
  const sorted = [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <ul className={s.receipt} style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
      {sorted.map((e, i) => {
        const kind = kindOf(e.reason);
        const { Icon, color } = kindVisual(kind, team);
        const gain = e.delta >= 0;
        return (
          <li
            key={`${e.createdAt}-${e.reason}-${i}`}
            className={`${s.rise} ${s.receiptRow}`}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0" }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                flex: "none",
                width: 40,
                height: 40,
                borderRadius: 4,
                color,
                background: `color-mix(in srgb, ${color} 12%, var(--cream))`,
                border: `1.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
                transform: `rotate(${i % 2 ? 2 : -2}deg)`,
              }}
            >
              <Icon size={22} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{KIND_COPY[kind].title}</span>
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
                fontFamily: "var(--font-mono)",
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
