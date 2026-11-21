"use client";

import { BountyIcon, CheckIcon, PinIcon, TradeIcon, StarIcon } from "@/components/icons";
import type { BoardItem } from "./boardStore";
import type { BoardPost } from "./types";
import { KIND_INK, KIND_LABEL, TEAM_SHORT, teamFill, teamGlow, tiltFor, timeAgo } from "./format";
import { Avatar, Coin, Stamp, Thumbtack } from "./bits";
import s from "./market.module.css";

const PAPER_INK = "#1d1b16";
const PAPER_MUTED = "#5a5345";
const STAMP_RED = "#c0261b";
const STAMP_GREEN = "#1d7a3e";

interface NoticeProps {
  item: BoardItem;
  now: number | null;
  /** Preview mode for the composer: no action button, no tilt. */
  preview?: boolean;
  onPrimary?: (item: BoardItem) => void;
  onCancel?: (item: BoardItem) => void;
}

function KindIcon({ kind }: { kind: BoardPost["kind"] }) {
  if (kind === "trade") return <TradeIcon size={16} weight={2.4} />;
  if (kind === "offer") return <StarIcon size={16} weight={2.4} />;
  return <BountyIcon size={16} weight={2.2} />;
}

function Seal({ post }: { post: BoardPost }) {
  if (post.kind === "trade" && post.reward <= 0) return null;
  const top = post.kind === "bounty" ? "Reward" : post.kind === "trade" ? "Bonus" : "Asks";
  const free = post.kind === "offer" && post.reward <= 0;
  return (
    <div className={s.seal} aria-label={free ? "Free" : `${top} ${post.reward} tokens`}>
      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1 }}>
        {free ? "No" : top}
      </span>
      <span className="num" style={{ fontSize: free ? 17 : 24, fontWeight: 800, lineHeight: 1 }}>
        {free ? "COST" : post.reward}
      </span>
    </div>
  );
}

function primaryLabel(item: BoardItem): { text: string; done: boolean; disabled: boolean } {
  const { post, action, server } = item;
  if (item.pending) return { text: "Updating…", done: true, disabled: true };
  if (server?.status === "completed") return { text: "Delivery complete", done: true, disabled: true };
  if (server?.status === "cancelled") return { text: "Taken down", done: true, disabled: true };
  if (post.mine && server?.status === "reserved") return { text: post.kind === "offer" ? "Confirm delivery · collect payment" : `Confirm delivery · pay ${post.reward}`, done: false, disabled: false };
  if (post.mine) return { text: post.kind === "offer" ? "Take down" : "Take down & refund", done: true, disabled: false };
  if (action) return { text: post.kind === "offer" ? "Release & refund payment" : "Release reservation", done: true, disabled: false };
  if (server?.status === "reserved" || item.status === "claimed") return { text: "Reserved by another rider", done: true, disabled: true };
  if (post.kind === "bounty") return { text: "Take bounty", done: false, disabled: false };
  if (post.kind === "trade") return { text: "Arrange trade", done: false, disabled: false };
  return { text: post.reward > 0 ? `Reserve for ${post.reward}` : "Reserve offer", done: false, disabled: false };
}

export function BountyNotice({ item, now, preview, onPrimary, onCancel }: NoticeProps) {
  const { post, status, action } = item;
  const ink = KIND_INK[post.kind];
  const tilt = preview ? 0 : tiltFor(post.id);
  const label = primaryLabel(item);
  const byYou = !!action;
  const completed = item.server?.status === "completed";

  return (
    <article
      className={`${s.notice} ${item.fresh && !preview ? s.fresh : ""}`}
      style={{ ["--rot" as string]: `${tilt}deg` }}
      aria-label={`${KIND_LABEL[post.kind]}: ${post.title}`}
    >
      <div className={`${s.paper} ${s[post.kind]}`} style={{ opacity: status === "claimed" && !byYou && !post.mine ? 0.86 : 1 }}>
        {post.kind === "bounty" ? <Thumbtack color={teamGlow(post.author.team)} /> : null}
        {post.kind === "trade" ? (
          <>
            <span className={`${s.tape} ${s.tapeLeft}`} aria-hidden="true" />
            <span className={`${s.tape} ${s.tapeRight}`} aria-hidden="true" />
          </>
        ) : null}
        {post.kind === "offer" ? <span className={`${s.tape} ${s.tapeCenter}`} aria-hidden="true" /> : null}
        <Seal post={post} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: ink,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 12.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            paddingRight: 60,
            minWidth: 0,
          }}
        >
          <KindIcon kind={post.kind} />
          <span>{KIND_LABEL[post.kind]}</span>
          {post.mine ? (
            <span
              style={{
                marginLeft: 2,
                padding: "1px 6px",
                borderRadius: 4,
                background: ink,
                color: "#f6f0de",
                fontSize: 9.5,
                letterSpacing: "0.12em",
              }}
            >
              Yours
            </span>
          ) : null}
        </div>

        <h3
          style={{
            marginTop: 8,
            paddingRight: post.kind === "trade" && post.reward <= 0 ? 0 : 44,
            fontSize: 21,
            fontWeight: 800,
            lineHeight: 1.08,
            color: PAPER_INK,
            overflowWrap: "anywhere",
          }}
        >
          {post.title}
        </h3>

        {post.station ? (
          <p style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12.5, fontWeight: 700, color: ink }}>
            <PinIcon size={14} weight={2.3} />
            {post.station}
          </p>
        ) : null}

        {post.body ? (
          <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.42, color: "#3a352b", overflowWrap: "anywhere" }}>{post.body}</p>
        ) : null}

        {post.kind === "trade" && (post.have || post.want) ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 8,
              padding: "10px 10px",
              borderRadius: 8,
              border: `1.5px dashed ${ink}55`,
              background: "rgba(255,255,255,0.45)",
            }}
          >
            <TradeSide label="Has" value={post.have ?? "?"} />
            <span style={{ color: ink }}>
              <TradeIcon size={20} weight={2.4} />
            </span>
            <TradeSide label="Wants" value={post.want ?? "?"} />
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, minWidth: 0 }}>
          <Avatar handle={post.author.handle} team={post.author.team} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 13.5,
                  color: PAPER_INK,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                @{post.author.handle}
              </span>
              <span
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: PAPER_MUTED,
                }}
              >
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: teamFill(post.author.team) }} />
                {TEAM_SHORT[post.author.team]}
              </span>
            </p>
            <p style={{ fontSize: 12, color: PAPER_MUTED, marginTop: 1 }}>
              {timeAgo(post, now)}
              {post.interested > 0 ? ` · ${post.interested} interested` : ""}
            </p>
          </div>
          {status === "claimed" ? (
            <Stamp key={`c-${action ?? "x"}`} label={completed ? "Delivered" : byYou ? "Yours" : "Reserved"} color={STAMP_RED} size={15} rot={-9} slam={byYou} />
          ) : (
            <Stamp key="open" label={action === "offered" ? "Pending" : "Open"} color={action === "offered" ? KIND_INK.trade : STAMP_GREEN} rot={6} slam={action === "offered"} />
          )}
        </div>

        {!preview && item.server?.status === "reserved" ? <p style={{ fontSize: 14, lineHeight: 1.5, color: PAPER_MUTED, marginTop: 12 }}>
          Reserved by <strong>{item.server.claimantName}</strong>. {post.mine ? "Confirm only after delivery; this transfers the held tokens." : byYou ? "Arrange delivery with the author, who confirms the transfer." : "This task is already being handled."}
        </p> : null}
        {!preview && completed ? <p style={{ fontSize: 14, lineHeight: 1.5, color: PAPER_MUTED, marginTop: 12 }}>Delivery confirmed. {post.reward} CitiTokens transferred.</p> : null}
        {!preview ? (
          <button
            type="button"
            className={s.inkBtn}
            disabled={label.disabled}
            onClick={() => onPrimary?.(item)}
            style={{
              marginTop: 12,
              background: label.done ? "transparent" : PAPER_INK,
              color: label.done ? PAPER_INK : "#f6f0de",
              boxShadow: label.done ? `inset 0 0 0 2px ${PAPER_INK}${label.disabled ? "44" : "cc"}` : "0 3px 0 rgba(0,0,0,0.35)",
              opacity: label.disabled ? 0.55 : 1,
            }}
          >
            {label.done && !label.disabled && !post.mine ? <CheckIcon size={18} weight={2.6} /> : null}
            {label.text}
            {!label.done && post.kind !== "trade" && post.reward > 0 ? <Coin size={20} /> : null}
          </button>
        ) : null}
        {!preview && post.mine && item.server?.status === "reserved" ? <button type="button" disabled={item.pending} onClick={() => onCancel?.(item)} style={{ width: "100%", minHeight: 44, marginTop: 8, border: `1px solid ${PAPER_MUTED}66`, borderRadius: 10, background: "transparent", color: PAPER_INK, fontSize: 14, fontWeight: 700 }}>Cancel reservation & refund</button> : null}
      </div>
    </article>
  );
}

function TradeSide({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: PAPER_MUTED }}>{label}</p>
      <p style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, color: PAPER_INK, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}
