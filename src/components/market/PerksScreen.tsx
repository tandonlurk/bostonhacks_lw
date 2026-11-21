"use client";

import { useCallback, useMemo, useState } from "react";
import type { Perk, RedeemPerkResponse } from "@/contracts";
import { riderFixture } from "@/contracts/fixtures";
import { useRider } from "@/hooks/useRider";
import { useTokens } from "@/hooks/useTokens";
import { usePerks } from "@/hooks/usePerks";
import { Sheet } from "@/components/ui/Sheet";
import { BountyIcon, CheckIcon, CloseIcon, PerkIcon, PlusIcon, TradeIcon } from "@/components/icons";
import { useBoard, type BoardItem } from "./boardStore";
import type { BoardPost } from "./types";
import { CoinCounter } from "./CoinCounter";
import { Segmented } from "./Segmented";
import { BoardView } from "./BoardView";
import { CatalogView } from "./CatalogView";
import { PostComposer } from "./PostComposer";
import { RedeemPanel, JoinPrompt } from "./RedeemPanel";
import { Toast, useToast } from "./Toast";
import { useNow } from "./useNow";
import { usePreviewRider, useQueryParam } from "./usePreview";
import s from "./market.module.css";

type Tab = "board" | "perks";

export function PerksScreen() {
  const riderState = useRider();
  const preview = usePreviewRider();
  const rider = preview === "joined" ? riderState.rider ?? riderFixture : preview === "guest" ? null : riderState.rider;
  const riderId = rider?.riderId ?? null;

  const { data: tokens, refresh: refreshTokens } = useTokens(riderId);
  const { data: perks, loading: perksLoading, refresh: refreshPerks } = usePerks();
  const board = useBoard();
  const now = useNow();
  const { toast, show } = useToast();

  const tabParam = useQueryParam("tab");
  const [tabChoice, setTabChoice] = useState<Tab | null>(null);
  const tab: Tab = tabChoice ?? (tabParam === "perks" ? "perks" : "board");

  // Show the server's post-redeem balance immediately, until the next tokens poll lands (or forever in mock mode).
  const [balanceOverride, setBalanceOverride] = useState<{ src: typeof tokens; value: number } | null>(null);
  const serverBalance = riderId ? (tokens?.balance ?? null) : null;
  const balance = balanceOverride && balanceOverride.src === tokens && riderId ? balanceOverride.value : serverBalance;

  // Same idea for stock: decrement locally right away; a fresh catalog from the poll replaces it.
  const [stockAdjust, setStockAdjust] = useState<{ src: typeof perks; taken: Record<string, number> }>({ src: perks, taken: {} });
  const catalog: Perk[] = useMemo(() => {
    const taken = stockAdjust.src === perks ? stockAdjust.taken : {};
    return perks.map((p) => (taken[p.id] ? { ...p, remaining: Math.max(0, p.remaining - taken[p.id]) } : p));
  }, [perks, stockAdjust]);

  const offerSpend = board.items
    .filter((i) => i.action === "claimed" && i.post.kind === "offer")
    .reduce((sum, i) => sum + i.post.reward, 0);
  const held = board.escrow + offerSpend;
  const available = Math.max(0, (balance ?? 0) - held);

  const [composerOpen, setComposerOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<Perk | null>(null);

  const promptJoin = useCallback(
    (what: string) => show({ text: `Join a line to ${what}.`, tone: "hot", link: { href: "/", label: "Join" } }),
    [show],
  );

  const onPrimary = useCallback(
    (item: BoardItem) => {
      const { post, action } = item;
      if (!rider) return promptJoin(post.kind === "bounty" ? "take bounties" : post.kind === "trade" ? "trade" : "claim offers");
      if (post.mine) {
        board.removePost(post.id);
        const back = post.kind === "offer" ? 0 : post.reward;
        return show({ text: back ? `Taken down. ${back} tokens back in your pocket.` : "Taken down.", icon: <CloseIcon size={20} /> });
      }
      if (action) {
        board.setAction(post.id, null);
        const what = action === "took" ? "Bounty dropped" : action === "offered" ? "Trade offer cancelled" : "Claim undone";
        return show({ text: `${what}.`, tone: "plain" });
      }
      if (item.status === "claimed") return;
      if (post.kind === "bounty") {
        board.setAction(post.id, "took");
        return show({
          text: `It's yours. Deliver to earn ${post.reward} tokens.`,
          tone: "accent",
          icon: <BountyIcon size={22} />,
        });
      }
      if (post.kind === "trade") {
        board.setAction(post.id, "offered");
        return show({ text: `Offer sent to @${post.author.handle}.`, tone: "accent", icon: <TradeIcon size={22} /> });
      }
      if (post.reward > available) {
        return show({ text: `You need ${post.reward - available} more tokens for that.`, tone: "hot" });
      }
      board.setAction(post.id, "claimed");
      show({
        text: post.reward ? `Claimed for ${post.reward} tokens. @${post.author.handle} will find you.` : `Claimed. @${post.author.handle} will find you.`,
        tone: "accent",
        icon: <CheckIcon size={22} />,
      });
    },
    [rider, board, show, promptJoin, available],
  );

  const onPost = useCallback(
    (post: BoardPost) => {
      board.addPost(post);
      setComposerOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      show({
        text: post.kind === "offer" || post.reward === 0 ? "Pinned to the board." : `Pinned. ${post.reward} tokens held for the winner.`,
        tone: "accent",
        icon: <CheckIcon size={22} />,
      });
    },
    [board, show],
  );

  const onRedeemed = useCallback(
    (res: RedeemPerkResponse, perkId: string) => {
      setBalanceOverride({ src: tokens, value: res.tokensLeft });
      setStockAdjust((prev) => {
        const base = prev.src === perks ? prev.taken : {};
        return { src: perks, taken: { ...base, [perkId]: (base[perkId] ?? 0) + 1 } };
      });
      refreshTokens();
      refreshPerks();
    },
    [tokens, perks, refreshTokens, refreshPerks],
  );

  const openCount = board.items.filter((i) => i.status === "open").length;
  const affordable = catalog.filter((p) => p.remaining > 0 && balance != null && balance >= p.costTokens).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header className="screen-header" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>Perks</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              {tab === "board" ? "Post bounties. Trade coins." : "Spend CitiTokens around Boston."}
            </p>
          </div>
          <CoinCounter balance={balance} held={rider ? held : 0} />
        </div>
        <Segmented<Tab>
          label="Perks sections"
          value={tab}
          onChange={setTabChoice}
          options={[
            { value: "board", label: "Board", icon: <BountyIcon size={18} />, badge: openCount },
            { value: "perks", label: "Perks", icon: <PerkIcon size={18} />, badge: affordable || undefined },
          ]}
        />
      </header>

      {tab === "board" ? (
        <BoardView items={board.items} now={now} rider={rider} onPrimary={onPrimary} onCompose={() => setComposerOpen(true)} onNeedJoin={() => promptJoin("filter by your line")} />
      ) : (
        <CatalogView perks={catalog} loading={perksLoading} balance={balance} joined={!!rider} now={now} onOpen={setRedeeming} />
      )}

      {tab === "board" ? (
        <button
          type="button"
          aria-label="New post"
          onClick={() => setComposerOpen(true)}
          className={`${s.fab} ${s.press}`}
          style={{
            position: "fixed",
            right: "max(16px, calc(50vw - 210px + 4px))",
            bottom: "calc(var(--nav-clearance) + 2px)",
            zIndex: 30,
            minHeight: 56,
            padding: "0 22px 0 18px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 17,
            boxShadow: "0 0 0 4px var(--bg), 0 12px 30px rgba(228,255,58,0.3)",
          }}
        >
          <PlusIcon size={22} weight={2.8} />
          Post
        </button>
      ) : null}

      <Sheet open={composerOpen} onClose={() => setComposerOpen(false)} title={rider ? "Pin a post" : "Join to post"}>
        {rider ? (
          <PostComposer rider={rider} available={available} onPost={onPost} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <JoinPrompt
              text="The board is open to everyone, but posting bounties and trades needs a home line. Pick yours on the Ride tab."
              onClose={() => setComposerOpen(false)}
            />
          </div>
        )}
      </Sheet>

      <Sheet open={!!redeeming} onClose={() => setRedeeming(null)} title="Redeem perk">
        {redeeming ? (
          <RedeemPanel
            key={redeeming.id}
            perk={redeeming}
            riderId={riderId}
            balance={balance}
            onClose={() => setRedeeming(null)}
            onRedeemed={(res) => onRedeemed(res, redeeming.id)}
          />
        ) : null}
      </Sheet>

      <Toast toast={toast} />
    </div>
  );
}
