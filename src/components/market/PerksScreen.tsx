"use client";

import { useCallback, useMemo, useState } from "react";
import type { BountyAction, Perk, RedeemPerkResponse } from "@/contracts";
import { riderFixture } from "@/contracts/fixtures";
import { useRider } from "@/hooks/useRider";
import { useTokens } from "@/hooks/useTokens";
import { usePerks } from "@/hooks/usePerks";
import { Sheet } from "@/components/ui/Sheet";
import { BountyIcon, CheckIcon, PerkIcon, PlusIcon } from "@/components/icons";
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
  const board = useBoard(riderId);
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

  // Escrow is already debited by the server. The wallet balance is what can be spent.
  const held = board.escrow;
  const available = Math.max(0, balance ?? 0);

  const [composerOpen, setComposerOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<Perk | null>(null);

  const promptJoin = useCallback(
    (what: string) => show({ text: `Join a line to ${what}.`, tone: "hot", link: { href: "/", label: "Join" } }),
    [show],
  );

  const updateBoard = async (item: BoardItem, action: BountyAction) => {
    if (!rider) return promptJoin("use the board");
    try {
      const res = await board.act(item.post.id, action);
      setBalanceOverride({ src: tokens, value: res.tokensLeft });
      refreshTokens();
      show({ text: action === "complete" ? "Delivery confirmed. Tokens transferred." : action === "cancel" ? "Post taken down. Held tokens refunded." : action === "release" ? "Reservation released. Any held payment was refunded." : "Reserved. Arrange delivery, then the author confirms it.", tone: "accent", icon: <CheckIcon size={20} /> });
    } catch (err) { show({ text: err instanceof Error ? err.message : "That update did not go through.", tone: "hot" }); }
  };
  const onPrimary = (item: BoardItem) => {
    const action: BountyAction = item.post.mine ? item.server?.status === "reserved" ? "complete" : "cancel" : item.action ? "release" : "claim";
    void updateBoard(item, action);
  };
  const onPost = async (post: BoardPost, requestId: string) => {
    const res = await board.create(post, requestId);
    setBalanceOverride({ src: tokens, value: res.tokensLeft });
    refreshTokens();
    setComposerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    show({ text: post.kind === "offer" || post.reward === 0 ? "Pinned to the shared board." : `Pinned. ${post.reward} tokens held until delivery or cancellation.`, tone: "accent", icon: <CheckIcon size={22} /> });
  };

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
        <>
          <div style={{ margin: "0 16px 16px", padding: "12px 14px", borderRadius: 16, background: "var(--surface-2)", color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
            {board.mock ? "Sample board · actions do not transfer tokens in mock mode." : "A board for your fellow riders. Tokens are held safely until the author confirms delivery. Trades arrange items between riders; only CitiTokens transfer here."}
          </div>
          {board.loading ? <p role="status" style={{ padding: 16 }}>Loading the board…</p> : null}
          {board.error ? <div role="alert" style={{ padding: 16, color: "var(--hot)" }}>{board.error}<button type="button" onClick={() => void board.refresh()} style={{ display: "block", minHeight: 44, background: "transparent", border: "none", textDecoration: "underline" }}>Try again</button></div> : null}
          {!board.loading && !board.error ? <BoardView items={board.items} now={now} rider={rider} onPrimary={onPrimary} onCancel={(item) => void updateBoard(item, "cancel")} onCompose={() => setComposerOpen(true)} onNeedJoin={() => promptJoin("filter by your line")} /> : null}
        </>
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
