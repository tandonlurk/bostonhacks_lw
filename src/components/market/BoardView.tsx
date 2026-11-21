"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Rider } from "@/contracts";
import { BountyIcon, PlusIcon } from "@/components/icons";
import type { BoardItem } from "./boardStore";
import { BoardFilters, type KindFilter } from "./BoardFilters";
import { BountyNotice } from "./BountyNotice";
import { KIND_PLURAL, TEAM_SHORT } from "./format";
import s from "./market.module.css";

interface Props {
  items: BoardItem[];
  now: number | null;
  rider: Rider | null;
  onPrimary: (item: BoardItem) => void;
  onCancel: (item: BoardItem) => void;
  onCompose: () => void;
  onNeedJoin: () => void;
}

export function BoardView({ items, now, rider, onPrimary, onCancel, onCompose, onNeedJoin }: Props) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [myLine, setMyLine] = useState(false);
  const team = rider?.homeTeamRouteId ?? null;

  const lineItems = useMemo(() => (myLine && team ? items.filter((i) => i.post.author.team === team) : items), [items, myLine, team]);
  const counts = useMemo(() => {
    const c: Record<KindFilter, number> = { all: lineItems.length, bounty: 0, trade: 0, offer: 0 };
    for (const i of lineItems) c[i.post.kind] += 1;
    return c;
  }, [lineItems]);
  const shown = kind === "all" ? lineItems : lineItems.filter((i) => i.post.kind === kind);
  const pot = items
    .filter((i) => i.status === "open" && i.post.kind === "bounty")
    .reduce((sum, i) => sum + i.post.reward, 0);

  return (
    <section aria-label="Bounty board" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <BoardFilters
          kind={kind}
          onKind={setKind}
          counts={counts}
          myLine={myLine}
          onMyLine={(v) => {
            if (!team) return onNeedJoin();
            setMyLine(v);
          }}
          team={team}
        />

        <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
          <span aria-hidden="true" style={{ position: "relative", width: 8, height: 8, flex: "none" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--hot)" }} />
            <span
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--hot)", animation: "pulse-ring 1.8s ease-out infinite" }}
            />
          </span>
          <span>
            <span className="num" style={{ color: "var(--accent)", fontWeight: 800, fontSize: 14 }}>
              {pot}
            </span>{" "}
            tokens up for grabs across the city
          </span>
        </p>

        {!rider ? (
          <div
            className="glass"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 14px", borderRadius: 18 }}
          >
            <p style={{ flex: 1, fontSize: 13.5, lineHeight: 1.35 }}>
              <strong>Browsing as a guest.</strong> <span style={{ color: "var(--muted)" }}>Pick a home line to post and take bounties.</span>
            </p>
            <Link
              href="/"
              style={{
                flex: "none",
                minHeight: 44,
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Join
            </Link>
          </div>
        ) : null}
      </div>

      {shown.length ? (
        <div className={s.board}>
          {shown.map((item) => (
            <BountyNotice key={item.post.id} item={item} now={now} onPrimary={onPrimary} onCancel={onCancel} />
          ))}
          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", padding: "4px 0 8px" }}>
            That&apos;s the whole board. Got something to post?
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px 120px", textAlign: "center" }}>
          <span style={{ color: "var(--muted)" }}>
            <BountyIcon size={44} weight={1.8} />
          </span>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>Nothing pinned here yet</p>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280 }}>
            No {kind === "all" ? "posts" : KIND_PLURAL[kind].toLowerCase()}
            {myLine && team ? ` from ${TEAM_SHORT[team]} Line riders` : ""} right now. Be the first.
          </p>
          <button
            type="button"
            onClick={onCompose}
            className={s.press}
            style={{
              marginTop: 6,
              minHeight: 48,
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-2)",
              fontWeight: 800,
            }}
          >
            <PlusIcon size={18} weight={2.6} />
            Post the first one
          </button>
        </div>
      )}
    </section>
  );
}
