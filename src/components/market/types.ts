import type { TeamRouteId } from "@/contracts/routes";

/** Board post kinds. Bounty: someone pays tokens for a task. Trade: swap perks/items. Offer: a rider sells a favor. */
export type PostKind = "bounty" | "trade" | "offer";

export interface BoardAuthor {
  handle: string;
  team: TeamRouteId;
}

/**
 * Client-side shape for a bounty board post. Mirrors what we expect B's /api/bounties (issue #92) to return;
 * keep it small so swapping the placeholder for the real endpoint is a mapping, not a rewrite.
 */
export interface BoardPost {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  /** Bounty: tokens paid out. Trade: tokens added as a sweetener. Offer: asking price. */
  reward: number;
  author: BoardAuthor;
  /** Trades only: what the poster gives and what they want back. */
  have?: string;
  want?: string;
  /** Optional station tag shown on the notice. */
  station?: string;
  status: "open" | "claimed";
  /** Other riders already interested (social proof). */
  interested: number;
  /** Seed posts carry a fixed age; posts made on this device carry a real timestamp. */
  ageMin?: number;
  createdAt?: number;
  mine?: boolean;
}

/** What this rider did to a post on this device (persisted in localStorage). */
export type PostAction = "took" | "offered" | "claimed";
