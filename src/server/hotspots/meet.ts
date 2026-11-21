// Hotspot meet ("phone bump") matching (owner: A, T25). Pure: decides what to do with the pending
// requests at one station; the service applies the plan under a per-station lock.
//
// Web apps can't use NFC / NameDrop, so "touching phones" is a simultaneous bump: both riders tap
// Bump at the same hotspot within ~10 s. Each tap shows a 4-digit code as a fallback ("enter my code").
// The client polls the same endpoint every ~2 s while `waiting`.

export const MEET = {
  /** a partner's request counts as a bump if they tapped / polled this recently */
  bumpWindowMs: 10_000,
  /** a request (and its code) stays open this long */
  codeTtlMs: 30_000,
  /** a rider who was matched while waiting has this long to poll and see it */
  deliveryMs: 30_000,
  /** report `expired` for a request that lapsed this recently; older ones are just replaced */
  expiredReportMs: 120_000,
  radiusM: 150,
  /** at most this much extra radius for a poor GPS fix */
  maxAccuracyBonusM: 100,
} as const;

/**
 * One bump request. Persisted in hotspot_meets: lastSeenAt is `created_at` (refreshed on every poll).
 * Unmatched + expiresAt in the future = open. Matched + expiresAt in the future = matched while waiting,
 * not yet seen by its rider (expiresAt is set to now once delivered).
 */
export interface MeetRow {
  id: number;
  riderId: string;
  hotspotId: string;
  stationId: string;
  code: string;
  lat: number;
  lng: number;
  partnerId: string | null;
  points: number;
  lastSeenAt: number;
  expiresAt: number;
  matchedAt: number | null;
}

export type MeetPlan =
  | { kind: "deliver"; row: MeetRow }
  | { kind: "expired"; row: MeetRow }
  | { kind: "match"; mine: MeetRow | null; partner: MeetRow }
  | { kind: "wait"; mine: MeetRow | null }
  | { kind: "code_not_found" }
  | { kind: "no_holder" };

/**
 * rows: recent requests at this station. holders: riders holding an unexpired hotspot at this station;
 * at least one rider of a pair must hold it (the partner can be anyone on any team).
 */
export function planMeet(
  rows: MeetRow[],
  input: { riderId: string; code?: string; now: number; holders: Set<string> },
): MeetPlan {
  const { riderId, code, now, holders } = input;
  const mine = rows.filter((r) => r.riderId === riderId).sort((a, b) => b.id - a.id)[0] ?? null;
  if (mine?.matchedAt && mine.expiresAt > now) return { kind: "deliver", row: mine };
  if (!code && mine && !mine.matchedAt && mine.expiresAt <= now && now - mine.expiresAt < MEET.expiredReportMs)
    return { kind: "expired", row: mine };
  const pending = mine && !mine.matchedAt && mine.expiresAt > now ? mine : null;
  const open = rows.filter((r) => r.riderId !== riderId && !r.matchedAt && r.expiresAt > now);
  const pairOk = (other: string) => holders.has(riderId) || holders.has(other);
  if (code) {
    const partner = open.find((r) => r.code === code);
    if (!partner) return { kind: "code_not_found" };
    if (!pairOk(partner.riderId)) return { kind: "no_holder" };
    return { kind: "match", mine: pending, partner };
  }
  const partner = open
    .filter((r) => now - r.lastSeenAt <= MEET.bumpWindowMs && pairOk(r.riderId))
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0];
  if (partner) return { kind: "match", mine: pending, partner };
  return { kind: "wait", mine: pending };
}

/** A 4-digit code not used by any open request at this station. */
export function newCode(rows: MeetRow[], now: number, rand: () => number = Math.random): string {
  const taken = new Set(rows.filter((r) => !r.matchedAt && r.expiresAt > now).map((r) => r.code));
  for (let i = 0; i < 50; i++) {
    const c = String(Math.floor(rand() * 10_000)).padStart(4, "0");
    if (!taken.has(c)) return c;
  }
  for (let i = 0; i < 10_000; i++) {
    const c = String(i).padStart(4, "0");
    if (!taken.has(c)) return c;
  }
  return "0000";
}

/** Award idempotency key: one meet bonus per rider per pair per station per UTC day. */
export function meetRef(riderId: string, partnerId: string, stationId: string, now: number): string {
  const day = new Date(now).toISOString().slice(0, 10);
  return `hotspot_meet:${stationId}:${day}:${[riderId, partnerId].sort().join("+")}:${riderId}`;
}

/** Allowed distance from the hotspot for a fix with this accuracy. */
export function meetRadiusM(accuracy?: number | null): number {
  const bonus = typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > 0 ? Math.min(accuracy, MEET.maxAccuracyBonusM) : 0;
  return MEET.radiusM + bonus;
}
