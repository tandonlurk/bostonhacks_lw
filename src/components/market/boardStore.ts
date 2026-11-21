"use client";

// Local-only state for the bounty board: the rider's own posts and what they did to other posts.
// Persisted in localStorage (every access wrapped; private mode or blocked storage just means it won't survive a reload).
// useSyncExternalStore keeps SSR and hydration clean: the server snapshot is always empty.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { BoardPost, PostAction } from "./types";
import { PLACEHOLDER_BOARD } from "./placeholderBoard";

const KEY = "tcity.board.v1";

interface BoardLocal {
  myPosts: BoardPost[];
  actions: Record<string, PostAction>;
}

const EMPTY: BoardLocal = { myPosts: [], actions: {} };

let cache: BoardLocal | null = null;
const listeners = new Set<() => void>();

function load(): BoardLocal {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BoardLocal>;
    return {
      myPosts: Array.isArray(parsed.myPosts) ? parsed.myPosts : [],
      actions: parsed.actions && typeof parsed.actions === "object" ? parsed.actions : {},
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): BoardLocal {
  if (!cache) cache = load();
  return cache;
}

function getServerSnapshot(): BoardLocal {
  return EMPTY;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function write(next: BoardLocal) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: keep the in-memory copy for this session
  }
  listeners.forEach((l) => l());
}

export interface BoardItem {
  post: BoardPost;
  /** What this rider did to it, if anything. */
  action: PostAction | null;
  /** Effective status after local actions. */
  status: "open" | "claimed";
  /** True for posts created during this session, used for the pin-drop entrance. */
  fresh: boolean;
}

const freshIds = new Set<string>();

export function useBoard() {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const items: BoardItem[] = useMemo(() => {
    const all = [...local.myPosts, ...PLACEHOLDER_BOARD];
    return all.map((post) => {
      const action = local.actions[post.id] ?? null;
      const status = post.status === "claimed" || action === "took" || action === "claimed" ? "claimed" : "open";
      return { post, action, status, fresh: freshIds.has(post.id) };
    });
  }, [local]);

  /** Tokens locked in this rider's own open bounties and trade sweeteners. */
  const escrow = useMemo(
    () => local.myPosts.filter((p) => p.kind !== "offer").reduce((sum, p) => sum + p.reward, 0),
    [local.myPosts],
  );

  const addPost = useCallback((post: BoardPost) => {
    freshIds.add(post.id);
    const cur = getSnapshot();
    write({ ...cur, myPosts: [post, ...cur.myPosts] });
  }, []);

  const removePost = useCallback((id: string) => {
    const cur = getSnapshot();
    write({ ...cur, myPosts: cur.myPosts.filter((p) => p.id !== id) });
  }, []);

  const setAction = useCallback((id: string, action: PostAction | null) => {
    const cur = getSnapshot();
    const actions = { ...cur.actions };
    if (action) actions[id] = action;
    else delete actions[id];
    write({ ...cur, actions });
  }, []);

  return { items, escrow, addPost, removePost, setAction };
}
