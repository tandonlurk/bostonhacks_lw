import type { TokenLedgerEntry } from "@/contracts";

export type ActivityKind = "ride" | "hunt" | "landmark" | "perk" | "bonus";

// Ledger reasons seen in the wild: "points:ride", "points:hunt", "points:landmark", "hunt:<id>", "redeem:<perkId>".
export function kindOf(reason: string): ActivityKind {
  const r = reason.toLowerCase();
  if (r.startsWith("redeem") || r.includes("perk")) return "perk";
  if (r.includes("landmark")) return "landmark";
  if (r.includes("hunt") || r.includes("bounty")) return "hunt";
  if (r.includes("ride")) return "ride";
  return "bonus";
}

export const KIND_COPY: Record<ActivityKind, { title: string; plural: string }> = {
  ride: { title: "Ride credited", plural: "Rides" },
  hunt: { title: "Hunt cleared", plural: "Hunts" },
  landmark: { title: "Landmark claimed", plural: "Landmarks" },
  perk: { title: "Perk redeemed", plural: "Perks" },
  bonus: { title: "Bonus", plural: "Bonuses" },
};

export function countByKind(ledger: TokenLedgerEntry[]): Record<ActivityKind, number> {
  const out: Record<ActivityKind, number> = { ride: 0, hunt: 0, landmark: 0, perk: 0, bonus: 0 };
  for (const e of ledger) out[kindOf(e.reason)] += 1;
  return out;
}

/** "just now", "12m ago", "3h ago", "yesterday", "4d ago", then a short date. */
export function relativeTime(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
