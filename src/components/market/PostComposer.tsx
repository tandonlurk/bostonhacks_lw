"use client";

import { useId, useState } from "react";
import type { Rider } from "@/contracts";
import { BountyIcon, PlusIcon, StarIcon, TradeIcon } from "@/components/icons";
import type { BoardPost, PostKind } from "./types";
import { BountyNotice } from "./BountyNotice";
import { Coin } from "./bits";
import s from "./market.module.css";

const KIND_OPTIONS: { value: PostKind; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "bounty", label: "Bounty", hint: "Pay for a task", icon: <BountyIcon size={22} /> },
  { value: "trade", label: "Trade", hint: "Swap perks", icon: <TradeIcon size={22} /> },
  { value: "offer", label: "Offer", hint: "Sell a favor", icon: <StarIcon size={22} /> },
];

const REWARD_LABEL: Record<PostKind, string> = { bounty: "Reward", trade: "Sweeten it", offer: "Asking price" };
const REWARD_HINT: Record<PostKind, string> = {
  bounty: "Held from your balance until someone delivers.",
  trade: "Optional tokens you add on top of the swap.",
  offer: "What riders pay you to claim it. 0 is free.",
};
const TITLE_PLACEHOLDER: Record<PostKind, string> = {
  bounty: "Photo of the Kenmore sign at rush hour",
  trade: "My coffee perk for a museum discount",
  offer: "I'll scout the fastest car at Downtown Crossing",
};

export function handleFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);
  return slug || "rider";
}

interface Props {
  rider: Rider;
  available: number;
  onPost: (post: BoardPost) => void;
}

export function PostComposer({ rider, available, onPost }: Props) {
  const uid = useId();
  const [kind, setKind] = useState<PostKind>("bounty");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [have, setHave] = useState("");
  const [want, setWant] = useState("");
  const [reward, setReward] = useState(5);

  const spends = kind !== "offer";
  const min = kind === "bounty" ? 1 : 0;
  const max = spends ? Math.max(0, available) : 50;
  const value = Math.min(Math.max(reward, min), Math.max(min, max));
  const broke = kind === "bounty" && available < 1;
  const titleOk = title.trim().length >= 4;
  const tradeOk = kind !== "trade" || (have.trim().length > 0 && want.trim().length > 0);
  const canPost = titleOk && tradeOk && !broke && (!spends || value <= available);

  const draft: BoardPost = {
    id: "draft",
    kind,
    title: title.trim() || TITLE_PLACEHOLDER[kind],
    body: body.trim(),
    reward: value,
    have: kind === "trade" ? have.trim() || "Your item" : undefined,
    want: kind === "trade" ? want.trim() || "What you want" : undefined,
    author: { handle: handleFor(rider.displayName), team: rider.homeTeamRouteId },
    status: "open",
    interested: 0,
    ageMin: 0,
    mine: true,
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    onPost({ ...draft, id: `mine-${Date.now().toString(36)}`, createdAt: Date.now(), ageMin: undefined });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <fieldset style={{ border: "none" }}>
        <legend style={legend}>What are you posting?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
          {KIND_OPTIONS.map((k) => {
            const active = k.value === kind;
            return (
              <button
                key={k.value}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(k.value)}
                className={s.press}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  minHeight: 84,
                  padding: "10px 12px",
                  borderRadius: 16,
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(228,255,58,0.1)" : "var(--surface-2)",
                  color: active ? "var(--accent)" : "var(--ink)",
                  textAlign: "left",
                }}
              >
                {k.icon}
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>{k.label}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.2 }}>{k.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field id={`${uid}-title`} label="Title" count={`${title.length}/70`}>
        <input
          id={`${uid}-title`}
          value={title}
          maxLength={70}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={TITLE_PLACEHOLDER[kind]}
          style={input}
          autoComplete="off"
        />
      </Field>

      {kind === "trade" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field id={`${uid}-have`} label="You have">
            <input id={`${uid}-have`} value={have} maxLength={40} onChange={(e) => setHave(e.target.value)} placeholder="Coffee perk" style={input} />
          </Field>
          <Field id={`${uid}-want`} label="You want">
            <input id={`${uid}-want`} value={want} maxLength={40} onChange={(e) => setWant(e.target.value)} placeholder="Museum perk" style={input} />
          </Field>
        </div>
      ) : null}

      <Field id={`${uid}-body`} label="Details" count={`${body.length}/200`}>
        <textarea
          id={`${uid}-body`}
          value={body}
          maxLength={200}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Where, when, what counts as proof."
          style={{ ...input, minHeight: 84, paddingTop: 12, resize: "none", lineHeight: 1.4 }}
        />
      </Field>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={legend} id={`${uid}-reward`}>
            {REWARD_LABEL[kind]}
          </span>
          {spends ? (
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              <span className="num" style={{ color: "var(--accent)", fontWeight: 800 }}>
                {available}
              </span>{" "}
              available
            </span>
          ) : null}
        </div>
        <div
          role="group"
          aria-labelledby={`${uid}-reward`}
          style={{
            marginTop: 8,
            display: "grid",
            gridTemplateColumns: "52px 1fr 52px",
            alignItems: "center",
            gap: 10,
            padding: 6,
            borderRadius: 20,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <StepBtn label="Less" disabled={value <= min} onClick={() => setReward(value - 1)}>
            <span aria-hidden="true" style={{ display: "block", width: 16, height: 3, borderRadius: 2, background: "currentColor" }} />
          </StepBtn>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} aria-live="polite">
            <Coin size={30} />
            <span className="num" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
              {value}
            </span>
          </div>
          <StepBtn label="More" disabled={value >= max} onClick={() => setReward(value + 1)}>
            <PlusIcon size={20} weight={2.6} />
          </StepBtn>
        </div>
        <p style={{ fontSize: 12.5, color: broke ? "var(--hot)" : "var(--muted)", marginTop: 8 }}>
          {broke ? "You need at least 1 token for a bounty. Ride a few stops to earn some." : REWARD_HINT[kind]}
        </p>
      </div>

      <div>
        <span style={legend}>Preview</span>
        <div style={{ padding: "22px 10px 4px" }} aria-hidden="true">
          <BountyNotice item={{ post: draft, action: null, status: "open", fresh: false }} now={null} preview />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canPost}
        className={s.inkBtn}
        style={{
          minHeight: 54,
          borderRadius: "var(--radius-pill)",
          background: canPost ? "var(--accent)" : "var(--surface-3)",
          color: canPost ? "var(--accent-ink)" : "var(--muted)",
          fontSize: 16.5,
          fontFamily: "var(--font-display)",
          boxShadow: canPost ? "0 10px 30px rgba(228,255,58,0.25)" : "none",
        }}
      >
        <PinGlyph />
        {canPost ? "Pin it to the board" : !titleOk ? "Add a title to post" : !tradeOk ? "Fill in have and want" : "Not enough tokens"}
      </button>
    </form>
  );
}

function Field({ id, label, count, children }: { id: string; label: string; count?: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label htmlFor={id} style={legend}>
          {label}
        </label>
        {count ? <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{count}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StepBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={s.press}
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        border: "none",
        display: "grid",
        placeItems: "center",
        background: disabled ? "transparent" : "var(--surface-3)",
        color: disabled ? "var(--surface-3)" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

function PinGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" aria-hidden="true">
      <path d="M12.3 14.4c-.1 2.4-.2 4.8-.4 7.2" />
      <path d="M8.1 3.1c2.6-.2 5.2-.2 7.8.1l-.9 5.1c1.8.9 3 2.4 3.3 4.3-4.1.5-8.3.5-12.5-.1.4-1.9 1.6-3.3 3.3-4.2l-1-5.2Z" />
    </svg>
  );
}

const legend: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 16,
  fontFamily: "inherit",
};
