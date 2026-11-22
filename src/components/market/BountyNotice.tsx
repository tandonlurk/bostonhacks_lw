"use client";

import { BountyIcon, CheckIcon, PinIcon, TradeIcon, StarIcon } from "@/components/icons";
import { PaperButton, Pin, Tape } from "@/components/paper/Paper";
import { StationArt } from "@/components/paper/origami";
import type { BoardItem } from "./boardStore";
import type { BoardPost } from "./types";
import { KIND_INK, KIND_LABEL, TEAM_SHORT, teamFill, tiltFor, timeAgo } from "./format";
import { Avatar, Coin, Stamp } from "./bits";
import s from "./market.module.css";

const PAPER_INK = "var(--ink)";
const PAPER_MUTED = "var(--muted)";
// Offer sticky notes are yellow stock; use a darker warm muted there to keep >= 4.5:1.
const NOTE_MUTED = "#5a4a33";
const STAMP_RED = "var(--glow-red)";
const STAMP_GREEN = "var(--accent)";

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
    <div className={s.seal} role="img" aria-label={free ? "Free" : `${top} ${post.reward} tokens`}>
      <span className={s.sealFace}>
        <span aria-hidden="true" style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}>
          {free ? "Free" : top}
        </span>
        <span aria-hidden="true" className="num" style={{ fontSize: free ? 13 : 19, fontWeight: 800, lineHeight: 1.05 }}>
          {free ? "0" : post.reward}
        </span>
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
  const muted = post.kind === "offer" ? NOTE_MUTED : PAPER_MUTED;
  const tilt = preview ? 0 : tiltFor(post.id);
  const label = primaryLabel(item);
  const byYou = !!action;
  const completed = item.server?.status === "completed";
  const takenByOther = status === "claimed" && !byYou && !post.mine;

  return (
    <article
      className={`${s.notice} ${item.fresh && !preview ? s.fresh : ""}`}
      style={{ ["--rot" as string]: `${tilt}deg` }}
      aria-label={`${KIND_LABEL[post.kind]}: ${post.title}`}
    >
      <div className={`${s.paper} ${s[post.kind]}`} style={{ filter: takenByOther ? "saturate(0.75)" : undefined }}>
        {post.kind === "bounty" ? <Pin color={teamFill(post.author.team)} style={{ top: -7, width: 16, height: 16, marginLeft: -8 }} /> : null}
        {post.kind === "trade" ? (
          <>
            <Tape rotate={-32} style={{ top: 2, left: -14, marginLeft: 0, width: 54 }} />
            <Tape rotate={28} style={{ top: 2, left: "auto", right: -14, marginLeft: 0, width: 54 }} />
          </>
        ) : null}
        {post.kind === "offer" ? <Tape rotate={-3} /> : null}
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
                borderRadius: 3,
                background: ink,
                color: "var(--cream)",
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
            fontFamily: "var(--font-display)",
            fontSize: 21,
            fontWeight: 750,
            lineHeight: 1.12,
            color: PAPER_INK,
            overflowWrap: "anywhere",
          }}
        >
          {post.title}
        </h3>

        {post.station ? (
          <p style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13, fontWeight: 700, color: ink }}>
            <PinIcon size={14} weight={2.3} />
            {post.station}
            <StationArt name={post.station} height={20} style={{ marginLeft: 2, flex: "none" }} />
          </p>
        ) : null}

        {post.body ? (
          <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.45, color: PAPER_INK, overflowWrap: "anywhere" }}>{post.body}</p>
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
              borderRadius: 4,
              border: "1.5px dashed rgba(36,71,107,0.4)",
              background: "rgba(255,250,240,0.7)",
            }}
          >
            <TradeSide label="Has" value={post.have ?? "?"} />
            <span style={{ color: ink }}>
              <TradeIcon size={20} weight={2.4} />
            </span>
            <TradeSide label="Wants" value={post.want ?? "?"} />
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px dashed rgba(92,66,32,0.25)",
            minWidth: 0,
          }}
        >
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
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: muted,
                }}
              >
                <span aria-hidden="true" style={{ width: 12, height: 4, borderRadius: 1, background: teamFill(post.author.team) }} />
                {TEAM_SHORT[post.author.team]}
              </span>
            </p>
            <p style={{ fontSize: 12.5, color: muted, marginTop: 1 }}>
              {timeAgo(post, now)}
              {post.interested > 0 ? ` · ${post.interested} interested` : ""}
            </p>
          </div>
          {status === "claimed" ? (
            <Stamp key={`c-${action ?? "x"}`} label={completed ? "Delivered" : byYou ? "Yours" : "Claimed"} color={STAMP_RED} size={14} rot={-8} slam={byYou} />
          ) : (
            <Stamp key="open" label={action === "offered" ? "Pending" : item.fresh ? "New" : "Open"} color={action === "offered" ? KIND_INK.trade : STAMP_GREEN} rot={5} slam={action === "offered"} />
          )}
        </div>

        {!preview && item.server?.status === "reserved" ? <p style={{ fontSize: 14, lineHeight: 1.5, color: muted, marginTop: 12 }}>
          Reserved by <strong style={{ color: PAPER_INK }}>{item.server.claimantName}</strong>. {post.mine ? "Confirm only after delivery; this transfers the held tokens." : byYou ? "Arrange delivery with the author, who confirms the transfer." : "This task is already being handled."}
        </p> : null}
        {!preview && completed ? <p style={{ fontSize: 14, lineHeight: 1.5, color: muted, marginTop: 12 }}>Delivery confirmed. {post.reward} CitiTokens transferred.</p> : null}
        {!preview ? (
          <PaperButton
            variant={label.done ? "default" : "primary"}
            className={s.block}
            disabled={label.disabled}
            onClick={() => onPrimary?.(item)}
            style={{ marginTop: 12, minHeight: 46 }}
          >
            {label.done && !label.disabled && !post.mine ? <CheckIcon size={18} weight={2.6} /> : null}
            {label.text}
            {!label.done && post.kind !== "trade" && post.reward > 0 ? <Coin size={20} /> : null}
          </PaperButton>
        ) : null}
        {!preview && post.mine && item.server?.status === "reserved" ? (
          <PaperButton variant="ghost" className={s.block} disabled={item.pending} onClick={() => onCancel?.(item)} style={{ marginTop: 8, fontSize: 14 }}>
            Cancel reservation & refund
          </PaperButton>
        ) : null}
      </div>
    </article>
  );
}

function TradeSide({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a4a33" }}>{label}</p>
      <p style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, color: PAPER_INK, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}
