// Hotspot algorithm (owner: A, T25). Pure: no IO (tested offline by scripts/test-hotspots.mjs).
//
// 1. Mine the rider's most frequent trips (A->B and B->A are one commute, recent trips weigh more).
// 2. For each commute, find alternate routes on a *different line* to the same destination.
// 3. Pick one station on that alternate route, steering riders with shared interests (any team)
//    to the same station and spreading everyone else out with a small per-rider-per-day jitter.
import {
  haversineM,
  hopsFrom,
  isTransferStation,
  lineName,
  pathTo,
  shortestPath,
  shortestTree,
  stationName,
  viaPath,
  type Graph,
  type PathResult,
} from "./graph";

export const HOTSPOT = {
  multiplier: 5,
  basePoints: 10,
  /** basePoints x multiplier */
  meetPoints: 50,
  ttlMs: 24 * 60 * 60_000,
  tripsNeeded: 3,
  maxHotspots: 2,
  /** keep alternates costing at most usual x factor + slack */
  maxCostFactor: 1.8,
  maxCostSlack: 4,
  /** and travel at most this much farther on the ground */
  maxDistanceFactor: 1.6,
  maxExtraMeters: 2500,
  /** and cost at most this much more than the best alternate */
  maxOverBest: 4,
  /** weight of each other holder's interest overlap (Jaccard, 0-1) */
  socialWeight: 2,
  /** small bonus for interchange stations */
  transferBonus: 0.15,
  /** per-rider-per-day spread for riders with nothing in common */
  jitter: 0.6,
  /** recency half-life for commute mining */
  halfLifeDays: 7,
} as const;

// ---------- commute mining ----------
export interface TripLike {
  originStationId: string;
  destStationId: string;
  endedAt: string;
}
export interface Commute {
  from: string;
  to: string;
  trips: number;
  weight: number;
}

export function mineCommutes(trips: TripLike[], now: number, max: number = HOTSPOT.maxHotspots): Commute[] {
  const pairs = new Map<string, { trips: number; weight: number; dir: Map<string, number>; last: Map<string, number> }>();
  for (const t of trips) {
    if (!t.originStationId || !t.destStationId || t.originStationId === t.destStationId) continue;
    const [a, b] = [t.originStationId, t.destStationId].sort();
    const k = `${a}>${b}`;
    const ageDays = Math.max(0, (now - Date.parse(t.endedAt)) / 86_400_000);
    const w = 0.5 ** (ageDays / HOTSPOT.halfLifeDays);
    const p = pairs.get(k) ?? { trips: 0, weight: 0, dir: new Map(), last: new Map() };
    const d = `${t.originStationId}>${t.destStationId}`;
    p.trips++;
    p.weight += w;
    p.dir.set(d, (p.dir.get(d) ?? 0) + w);
    p.last.set(d, Math.max(p.last.get(d) ?? 0, Date.parse(t.endedAt)));
    pairs.set(k, p);
  }
  return [...pairs.values()]
    .map((p) => {
      // Usual direction: heaviest, ties to the most recent.
      const [dir] = [...p.dir.entries()].sort((x, y) => y[1] - x[1] || (p.last.get(y[0]) ?? 0) - (p.last.get(x[0]) ?? 0))[0];
      const [from, to] = dir.split(">");
      return { from, to, trips: p.trips, weight: p.weight };
    })
    .sort((a, b) => b.weight - a.weight || b.trips - a.trips || a.from.localeCompare(b.from))
    .slice(0, max);
}

// ---------- candidates ----------
export type CandidateTier = "alternate" | "nearby" | "nearest";
export interface Candidate {
  stationId: string;
  tier: CandidateTier;
  path: string[];
  /** lines in travel order, consecutive duplicates collapsed */
  lines: string[];
  cost: number;
  usualCost: number;
  reason: string;
}
export interface CandidateResult {
  from: string;
  to: string;
  usual: PathResult | null;
  candidates: Candidate[];
  /** set when there are no candidates */
  noAlternative?: string;
}

const WALK_LIMIT_M = 1200;
export function pathMeters(g: Graph, stations: string[]): number {
  let m = 0;
  for (let i = 1; i < stations.length; i++) m += haversineM(g.stations[stations[i - 1]], g.stations[stations[i]]);
  return m;
}
const linesOf = (p: PathResult) => p.legs.map((l) => l.line);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Where the alternate first boards a line the usual trip never uses. */
function boardingOfNewLine(alt: PathResult, usualLines: Set<string>) {
  return alt.legs.find((l) => !usualLines.has(l.line)) ?? null;
}

function usualPhrase(g: Graph, usual: PathResult): string {
  const first = usual.legs[0];
  return `riding the ${lineName(g, first.line)} all the way to ${stationName(g, first.to)}`;
}

export function findCandidates(g: Graph, from: string, to: string): CandidateResult {
  const base = { from, to, candidates: [] as Candidate[] };
  if (!g.adj.has(from) || !g.adj.has(to)) return { ...base, usual: null, noAlternative: "That trip isn't on the rapid transit map yet." };
  if (from === to) return { ...base, usual: null, noAlternative: "Your trip starts and ends at the same station." };
  const fromTree = shortestTree(g, from);
  const toTree = shortestTree(g, to);
  const usual = shortestPath(g, from, to);
  if (!usual) return { ...base, usual: null, noAlternative: "Those stations aren't connected on the rapid transit map." };
  const usualLines = new Set(linesOf(usual));
  const onUsual = new Set(usual.stations);
  const limit = usual.cost * HOTSPOT.maxCostFactor + HOTSPOT.maxCostSlack;
  const isStation = (id: string) => id.startsWith("place-");
  const D = stationName(g, to);
  const usualM = pathMeters(g, usual.stations);
  const maxMeters = Math.max(usualM * HOTSPOT.maxDistanceFactor, usualM + HOTSPOT.maxExtraMeters);

  // Tier 1: a different line to the same destination via a station off the usual path.
  const byStation = new Map<string, Candidate>();
  for (const x of g.adj.keys()) {
    if (!isStation(x) || onUsual.has(x)) continue;
    const alt = viaPath(g, fromTree, toTree, x, { simple: true });
    if (!alt || alt.cost > limit || alt.transfers > usual.transfers + 2) continue;
    if (pathMeters(g, alt.stations) > maxMeters) continue; // no loops out to the suburbs and back
    const board = boardingOfNewLine(alt, usualLines);
    if (!board) continue; // same lines (e.g. only a different Green branch) is not a different route
    const hotspot = board.from !== from && board.from !== to && isStation(board.from) ? board.from : x;
    const usualHere = usual.legs.find((l) => l.stations.slice(0, -1).includes(hotspot));
    const reason =
      hotspot !== board.from
        ? `Ride the ${lineName(g, board.line)} via ${stationName(g, hotspot)} instead of ${usualPhrase(g, usual)}.`
        : usualHere
          ? `At ${stationName(g, hotspot)}, take the ${lineName(g, board.line)} instead of ${usualHere.from === hotspot ? "the" : "staying on the"} ${lineName(g, usualHere.line)}.`
          : `Switch to the ${lineName(g, board.line)} at ${stationName(g, hotspot)} instead of ${usualPhrase(g, usual)}.`;
    const prev = byStation.get(hotspot);
    if (!prev || alt.cost < prev.cost)
      byStation.set(hotspot, {
        stationId: hotspot, tier: "alternate", path: alt.stations, lines: collapse(linesOf(alt)),
        cost: alt.cost, usualCost: usual.cost, reason,
      });
  }
  if (byStation.size) {
    const best = Math.min(...[...byStation.values()].map((c) => c.cost));
    const candidates = [...byStation.values()].filter((c) => c.cost <= best + HOTSPOT.maxOverBest);
    return { ...base, usual, candidates };
  }

  // Tier 2: an interchange within 2 hops of the usual path, as a short detour.
  const near = hopsFrom(g, usual.stations, 2);
  for (const [x] of near) {
    if (!isStation(x) || x === from || x === to || !isTransferStation(g, x)) continue;
    const alt = viaPath(g, fromTree, toTree, x);
    if (!alt) continue;
    const crossing = [...(g.linesAt.get(x) ?? [])].map((l) => lineName(g, l)).sort();
    base.candidates.push({
      stationId: x, tier: "nearby", path: alt.stations, lines: collapse(linesOf(alt)), cost: alt.cost, usualCost: usual.cost,
      reason: onUsual.has(x)
        ? `Stop off at ${stationName(g, x)} on your way to ${D}: the ${list(crossing)} cross there.`
        : `Make a short detour to ${stationName(g, x)} on your way to ${D}: the ${list(crossing)} cross there.`,
    });
  }
  if (base.candidates.length) return { ...base, usual };

  // Tier 3: a station on another line within walking distance of the destination (ride there, walk).
  const dest = g.stations[to];
  const nearest = [...g.adj.keys()]
    .filter((x) => isStation(x) && x !== from && x !== to && [...(g.linesAt.get(x) ?? [])].some((l) => !usualLines.has(l)))
    .map((x) => ({ x, m: haversineM(dest, g.stations[x]) }))
    .filter((c) => c.m <= WALK_LIMIT_M)
    .sort((a, b) => a.m - b.m)
    .slice(0, 3);
  for (const { x, m } of nearest) {
    const ride = pathTo(g, fromTree, x);
    if (!ride) continue;
    const other = [...(g.linesAt.get(x) ?? [])].find((l) => !usualLines.has(l))!;
    const mins = Math.max(1, Math.round(m / 80));
    base.candidates.push({
      stationId: x, tier: "nearest", path: [...ride.stations, to], lines: collapse(linesOf(ride)),
      // walking ~ one hop per 400 m
      cost: ride.cost + Math.ceil(m / 400), usualCost: usual.cost,
      reason: `Try the ${lineName(g, other)} at ${stationName(g, x)}, about ${mins} min on foot from ${D}, for a change from the ${lineName(g, usual.legs[0].line)}.`,
    });
  }
  if (base.candidates.length) return { ...base, usual };
  return { ...base, usual, noAlternative: "No other line serves that trip." };
}

export function collapse(xs: string[]): string[] {
  return xs.filter((x, i) => i === 0 || xs[i - 1] !== x);
}

// ---------- interest-weighted choice ----------
export interface Holder {
  riderId: string;
  stationId: string;
  interests: string[];
}
export interface Choice {
  candidate: Candidate;
  score: number;
  sharedInterests: string[];
  sharedWith: number;
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let both = 0;
  for (const x of A) if (B.has(x)) both++;
  return both / (A.size + B.size - both);
}

/** Deterministic [0,1) hash (FNV-1a) so a rider's pick is stable for the day. */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 2 ** 32;
}

/** Other riders (any team) holding a hotspot at `stationId`, and the interests we share with them. */
export function socialAt(stationId: string, me: { riderId: string; interests: string[] }, holders: Holder[]) {
  const byRider = new Map<string, string[]>();
  for (const h of holders) if (h.stationId === stationId && h.riderId !== me.riderId) byRider.set(h.riderId, h.interests);
  let pull = 0;
  const shared = new Set<string>();
  const mine = new Set(me.interests);
  for (const interests of byRider.values()) {
    pull += jaccard(me.interests, interests);
    for (const i of interests) if (mine.has(i)) shared.add(i);
  }
  return { pull, sharedWith: byRider.size, sharedInterests: [...shared].sort() };
}

export function scoreCandidate(
  c: Candidate,
  me: { riderId: string; interests: string[] },
  holders: Holder[],
  day: string,
  g: Graph,
): Choice {
  const extra = Math.max(0, c.cost - c.usualCost);
  const quality = 1 - Math.min(1, extra / (c.usualCost + HOTSPOT.maxCostSlack)) + (isTransferStation(g, c.stationId) ? HOTSPOT.transferBonus : 0);
  const social = socialAt(c.stationId, me, holders);
  const score = quality + HOTSPOT.socialWeight * social.pull + HOTSPOT.jitter * hash01(`${me.riderId}|${day}|${c.stationId}`);
  return { candidate: c, score, sharedInterests: social.sharedInterests, sharedWith: social.sharedWith };
}

export function chooseHotspot(
  candidates: Candidate[],
  me: { riderId: string; interests: string[] },
  holders: Holder[],
  day: string,
  g: Graph,
  exclude: Set<string> = new Set(),
): Choice | null {
  let best: Choice | null = null;
  for (const c of candidates) {
    if (exclude.has(c.stationId)) continue;
    const s = scoreCandidate(c, me, holders, day, g);
    if (!best || s.score > best.score || (s.score === best.score && c.stationId < best.candidate.stationId)) best = s;
  }
  return best;
}
