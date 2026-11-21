import type { TeamRouteId } from "@/contracts/routes";
import type { BoardPost, PostKind } from "./types";

/** Text color that passes contrast on each team's fill (same reasoning as LineChip). */
export const TEAM_INK: Record<TeamRouteId, string> = {
  Red: "#fff",
  Orange: "#14181c",
  Blue: "#fff",
  Green: "#fff",
  Silver: "#14181c",
};

export const TEAM_SHORT: Record<TeamRouteId, string> = {
  Red: "Red",
  Orange: "Orange",
  Blue: "Blue",
  Green: "Green",
  Silver: "Silver",
};

export const teamFill = (t: TeamRouteId) => `var(--line-${t.toLowerCase()})`;
export const teamGlow = (t: TeamRouteId) => `var(--glow-${t.toLowerCase()})`;

export const KIND_LABEL: Record<PostKind, string> = { bounty: "Wanted", trade: "Trade", offer: "Offer" };
export const KIND_PLURAL: Record<PostKind, string> = { bounty: "Bounties", trade: "Trades", offer: "Offers" };
/** Dark "printed ink" color per kind, legible on its paper stock. */
export const KIND_INK: Record<PostKind, string> = { bounty: "#8a2a12", trade: "#1f3f86", offer: "#3c4a00" };

export function initials(handle: string): string {
  const parts = handle.split(/[_\s.-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

/** Stable small hash so each notice keeps its own tilt between renders. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

const TILTS = [-1.6, 1.2, -0.7, 1.6, -1.2, 0.6, -0.3, 0.9];
export const tiltFor = (id: string) => TILTS[hash(id) % TILTS.length];

export function timeAgo(post: BoardPost, now: number | null): string {
  const mins = post.createdAt && now ? Math.max(0, Math.round((now - post.createdAt) / 60000)) : (post.ageMin ?? 0);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function countdown(iso: string, now: number | null): string {
  if (!now) return "";
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Rotating now";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `Rotates in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h < 24 ? `Rotates in ${h}h ${m}m` : `Rotates in ${Math.floor(h / 24)}d`;
}
