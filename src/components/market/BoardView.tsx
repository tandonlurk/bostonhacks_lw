"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Rider } from "@/contracts";
import { BountyIcon, PlusIcon } from "@/components/icons";
import { PaperButton, Pin, Tape } from "@/components/paper/Paper";
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
      <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
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

        {!rider ? (
          <div className={s.note} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px 12px 14px" }}>
            <Tape rotate={-4} style={{ left: 24, marginLeft: 0, width: 52 }} />
            <p style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
              <strong>Browsing as a guest.</strong> <span style={{ color: "var(--muted)" }}>Pick a home line to post and take bounties.</span>
            </p>
            <Link href="/" className="paper-btn paper-btn--primary" style={{ flex: "none", fontSize: 14 }}>
              Join
            </Link>
          </div>
        ) : null}
      </div>

      <div className={s.cork}>
        <div className={s.boardSign}>
          <span aria-hidden="true" style={{ position: "relative", width: 10, height: 10, flex: "none" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--hot)" }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--hot)", animation: "pulse-ring 1.8s ease-out infinite" }} />
          </span>
          <p style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.3, color: "var(--ink)" }}>
            <span className="paper-eyebrow" style={{ display: "block", fontSize: 10.5 }}>
              Station community board
            </span>
            <span className="num" style={{ color: "var(--accent)", fontWeight: 800, fontSize: 16 }}>
              {pot}
            </span>{" "}
            tokens up for grabs across the city
          </p>
        </div>

        {shown.length ? (
          <div className={s.board}>
            {shown.map((item) => (
              <BountyNotice key={item.post.id} item={item} now={now} onPrimary={onPrimary} onCancel={onCancel} />
            ))}
            <p className="hand" style={{ alignSelf: "center", fontSize: 20, color: "var(--ink)", padding: "2px 12px", background: "rgba(251,246,236,0.85)", borderRadius: 3 }}>
              That&apos;s the whole board. Got something to post?
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 18px 34px" }}>
            <div
              className={s.note}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px 20px", textAlign: "center", maxWidth: 320, transform: "rotate(-0.6deg)" }}
            >
              <Pin style={{ top: -6 }} />
              <span style={{ color: "var(--muted)" }}>
                <BountyIcon size={40} weight={1.8} />
              </span>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>Nothing pinned here yet</p>
              <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280 }}>
                No {kind === "all" ? "posts" : KIND_PLURAL[kind].toLowerCase()}
                {myLine && team ? ` from ${TEAM_SHORT[team]} Line riders` : ""} right now. Be the first.
              </p>
              <PaperButton onClick={onCompose} style={{ marginTop: 6 }}>
                <PlusIcon size={18} weight={2.6} />
                Post the first one
              </PaperButton>
            </div>
          </div>
        )}
      </div>
      <div style={{ height: 96 }} aria-hidden="true" />
    </section>
  );
}
