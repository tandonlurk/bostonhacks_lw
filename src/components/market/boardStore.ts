"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BountiesResponse, BountyAction, BountyMutationResponse, BountyPost, CreateBountyRequest } from "@/contracts";
import { bountiesFixture } from "@/contracts/game-fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";
import type { BoardPost, PostAction } from "./types";

export interface BoardItem {
  post: BoardPost;
  action: PostAction | null;
  status: "open" | "claimed";
  fresh: boolean;
  server?: BountyPost;
  pending?: boolean;
}
function mapPost(post: BountyPost, riderId: string | null): BoardPost {
  return { id: post.id, kind: post.kind, title: post.title, body: post.body, reward: post.rewardTokens, author: { handle: post.authorName, team: post.teamRouteId }, have: post.have, want: post.want, station: post.station, status: post.status === "open" ? "open" : "claimed", interested: 0, createdAt: Date.parse(post.createdAt), mine: post.authorId === riderId };
}
async function response<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "The board could not be updated. Try again.");
  return data;
}
export function useBoard(riderId: string | null) {
  const [posts, setPosts] = useState<BountyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const actor = useRef(riderId);
  useEffect(() => { actor.current = riderId; }, [riderId]);
  const generation = useRef(0);
  const mounted = useRef(false);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const data = await (USE_MOCKS ? Promise.resolve(bountiesFixture) : fetch("/api/bounties", { cache: "no-store" }).then(response<BountiesResponse>));
      if (mounted.current && request === generation.current) { setPosts(data.posts); setError(null); }
    } catch (err) {
      if (mounted.current && request === generation.current) setError(err instanceof Error ? err.message : "The board is unavailable.");
    } finally { if (mounted.current && request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { if (!mutation.current) void refresh(); }, 8000);
    return () => { mounted.current = false; window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);
  const mutate = useCallback(async (path: string, body: unknown): Promise<BountyMutationResponse> => {
    if (!riderId) throw new Error("Join a line before using the board.");
    if (USE_MOCKS) throw new Error("This is a sample board. Turn off mock mode to post or transfer tokens.");
    if (mutation.current) throw new Error("Wait for the current board update to finish.");
    mutation.current = true; generation.current++;
    setBusy(path === "/api/bounties" ? "new" : path.split("/").at(-1)!);
    try {
      const result = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(response<BountyMutationResponse>);
      if (mounted.current && actor.current === riderId) {
        setFresh(current => new Set(current).add(result.post.id));
        setPosts(current => [result.post, ...current.filter(p => p.id !== result.post.id)].filter(p => p.status !== "cancelled"));
      }
      return result;
    } finally {
      mutation.current = false;
      if (mounted.current) { setBusy(null); void refresh(); }
    }
  }, [riderId, refresh]);
  const create = useCallback((post: BoardPost, requestId: string) => {
    const input: CreateBountyRequest = { riderId: riderId!, requestId, kind: post.kind, title: post.title, body: post.body, rewardTokens: post.reward, have: post.have, want: post.want, station: post.station };
    return mutate("/api/bounties", input);
  }, [mutate, riderId]);
  const act = useCallback((id: string, action: BountyAction) => mutate(`/api/bounties/${encodeURIComponent(id)}`, { riderId, action }), [mutate, riderId]);
  const items = useMemo<BoardItem[]>(() => posts.map(server => {
    const mine = server.claimantId === riderId;
    const action = mine && server.status === "reserved" ? server.kind === "bounty" ? "took" : server.kind === "trade" ? "offered" : "claimed" : null;
    return { post: mapPost(server, riderId), server, action, status: server.status === "open" ? "open" : "claimed", fresh: fresh.has(server.id), pending: busy === server.id };
  }), [posts, riderId, busy, fresh]);
  const escrow = posts.filter(p => (p.status === "open" || p.status === "reserved") && (p.kind === "offer" ? p.status === "reserved" && p.claimantId === riderId : p.authorId === riderId)).reduce((sum, p) => sum + p.rewardTokens, 0);
  return { items, escrow, loading, error, busy, refresh, create, act, mock: USE_MOCKS };
}
