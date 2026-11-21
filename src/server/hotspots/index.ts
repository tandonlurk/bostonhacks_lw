// Hotspots service (owner: A, T25): pattern-mined alternate-route hotspots and 5x phone-bump meets.
// Algorithm: ./algorithm.ts, matching: ./meet.ts, persistence: ./store.ts. Contract: CONTRACTS.md 4e.
import { randomUUID } from "node:crypto";
import { TEAMS, toTeamRouteId } from "@/contracts";
import type { Hotspot, HotspotsResponse, MeetResponse, TeamRouteId } from "@/contracts";
import { HttpError } from "@/server/http";
import staticStops from "@/server/mbta/static-stops.json";
import { awardBonus } from "@/server/rides/points-bridge";
import { getRider, getRiders, listTrips, recordSyntheticTrip, type RiderRow } from "@/server/rides/store";
import { isSimulationRunning } from "@/server/sim";
import { chooseHotspot, findCandidates, HOTSPOT, mineCommutes, socialAt, type Holder } from "./algorithm";
import { buildGraph, haversineM, normalizeStation, stationName, type Graph, type StaticStops } from "./graph";
import { MEET, meetRadiusM, meetRef, newCode, planMeet, type MeetRow } from "./meet";
import { getHotspot, listHolders, listRiderHotspots, withRiderHotspots, withStationMeets } from "./store";

const shared = globalThis as unknown as { __tcityGraph?: Graph };
export function network(): Graph {
  return (shared.__tcityGraph ??= buildGraph(
    staticStops as unknown as StaticStops,
    toTeamRouteId,
    Object.fromEntries(Object.values(TEAMS).map((t) => [t.id, t.name])),
  ));
}

export function tripsNeeded(): number {
  const n = Number(process.env.HOTSPOT_TRIPS_NEEDED);
  return Number.isInteger(n) && n > 0 ? n : HOTSPOT.tripsNeeded;
}

/**
 * Demo commutes per home line. Each has a real alternative on another line, and they share downtown
 * hubs (Haymarket, Government Center, Downtown Crossing) so riders on different teams can converge.
 */
export const DEMO_COMMUTES: Record<TeamRouteId, { from: string; to: string; routeId: string }> = {
  Green: { from: "place-bucen", to: "place-dwnxg", routeId: "Green-B" }, // Haymarket / Government Center
  Orange: { from: "place-forhl", to: "place-gover", routeId: "Orange" }, // Haymarket / Downtown Crossing
  Blue: { from: "place-wondl", to: "place-dwnxg", routeId: "Blue" }, // Government Center / Airport
  Red: { from: "place-alfcl", to: "place-north", routeId: "Red" }, // Downtown Crossing
  Silver: { from: "place-nubn", to: "place-gover", routeId: "749" }, // South Station / Park Street
};

async function riderOr404(riderId: string): Promise<RiderRow> {
  const rider = await getRider(riderId);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown rider. Join again to keep playing.");
  return rider;
}

async function tripsFor(riderId: string) {
  const g = network();
  return (await listTrips({ riderId, limit: 200, sinceDays: 30 }))
    .map((t) => ({ ...t, originStationId: normalizeStation(g, t.originStationId) ?? "", destStationId: normalizeStation(g, t.destStationId) ?? "" }))
    .filter((t) => t.originStationId && t.destStationId && t.originStationId !== t.destStationId);
}

async function holdersWithInterests(now: number): Promise<Holder[]> {
  const rows = await listHolders(now);
  const riders = new Map((await getRiders([...new Set(rows.map((r) => r.riderId))])).map((r) => [r.id, r.interests]));
  return rows.map((r) => ({ riderId: r.riderId, stationId: r.stationId, interests: riders.get(r.riderId) ?? [] }));
}

/** Refresh the live social fields (others may have picked the same station since). */
function decorate(hotspots: Hotspot[], rider: RiderRow, holders: Holder[]): Hotspot[] {
  return hotspots.map((h) => {
    const s = socialAt(h.stationId, { riderId: rider.id, interests: rider.interests }, holders);
    return { ...h, sharedWith: s.sharedWith, sharedInterests: s.sharedInterests };
  });
}

function generate(rider: RiderRow, trips: Awaited<ReturnType<typeof tripsFor>>, holders: Holder[], now: number): Hotspot[] {
  const g = network();
  const me = { riderId: rider.id, interests: rider.interests };
  const others = holders.filter((h) => h.riderId !== rider.id);
  const day = new Date(now).toISOString().slice(0, 10);
  const taken = new Set<string>();
  const out: Hotspot[] = [];
  for (const commute of mineCommutes(trips, now, HOTSPOT.maxHotspots)) {
    const { candidates } = findCandidates(g, commute.from, commute.to);
    const choice = chooseHotspot(candidates, me, others, day, g, taken);
    if (!choice) continue;
    const c = choice.candidate;
    taken.add(c.stationId);
    const st = g.stations[c.stationId];
    out.push({
      id: `hs_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      stationId: c.stationId,
      name: st.name,
      lat: st.lat,
      lng: st.lng,
      fromStationId: commute.from,
      toStationId: commute.to,
      path: c.path,
      viaRouteIds: c.lines as TeamRouteId[],
      // #115: Silver is a side quest, not a team; say so when the alternate route uses it.
      reason: c.lines.includes("Silver") ? `${c.reason} Counts toward today's Silver Line side quest.` : c.reason,
      sharedInterests: choice.sharedInterests,
      sharedWith: choice.sharedWith,
      multiplier: HOTSPOT.multiplier,
      meetPoints: HOTSPOT.meetPoints,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + HOTSPOT.ttlMs).toISOString(),
    });
  }
  return out;
}

/** GET (force=false): reuse live hotspots, generate on first eligible call. POST generate: force=true. */
export async function getHotspots(riderId: string, force = false): Promise<HotspotsResponse> {
  const rider = await riderOr404(riderId);
  const needed = tripsNeeded();
  let trips = await tripsFor(riderId);
  if (trips.length < needed && (await isSimulationRunning())) {
    // Demo: seed a plausible commute on the rider's home line so the hotspot shows up right away.
    const demo = DEMO_COMMUTES[rider.homeTeamRouteId];
    for (let i = trips.length; i < needed; i++) {
      const [o, d] = i % 2 === 0 ? [demo.from, demo.to] : [demo.to, demo.from];
      await recordSyntheticTrip(riderId, o, d, demo.routeId, rider.homeTeamRouteId);
    }
    trips = await tripsFor(riderId);
  }
  const eligible = trips.length >= needed;
  const now = Date.now();
  const holders = await holdersWithInterests(now);
  const hotspots = eligible
    ? await withRiderHotspots(riderId, async (current) =>
        current.length && !force ? null : generate(rider, trips, holders, now),
      )
    : await listRiderHotspots(riderId, now);
  const fresh = await holdersWithInterests(Date.now());
  return { riderId, tripsLogged: trips.length, tripsNeeded: needed, eligible, hotspots: decorate(hotspots, rider, fresh) };
}

// ---------- meets ----------
export interface MeetInput {
  riderId: string;
  hotspotId: string;
  lat: number;
  lng: number;
  code?: string;
  accuracy?: number;
}

const teamName = (t: TeamRouteId) => TEAMS[t]?.name ?? `${t} Line`;

export async function meet(input: MeetInput): Promise<MeetResponse> {
  const rider = await riderOr404(input.riderId);
  const g = network();
  const now = Date.now();

  // The hotspot can be the caller's own or the partner's (partners need not hold one themselves).
  const found = await getHotspot(input.hotspotId);
  if (!found) throw new HttpError(404, "hotspot_not_found", "That hotspot doesn't exist. Refresh your hotspots.");
  if (Date.parse(found.hotspot.expiresAt) <= now)
    throw new HttpError(404, "hotspot_expired", "That hotspot has expired. Refresh your hotspots for a new one.");
  const stationId = found.hotspot.stationId;
  const station = g.stations[stationId];
  const name = stationName(g, stationId);

  const demo = await isSimulationRunning();
  const distance = station ? haversineM(input, station) : Infinity;
  if (!demo && distance > meetRadiusM(input.accuracy))
    throw new HttpError(403, "not_at_hotspot", `You're about ${Math.round(distance)} m from ${name}. Get within ${MEET.radiusM} m to bump.`);

  const holders = new Set((await listHolders(now)).filter((h) => h.stationId === stationId).map((h) => h.riderId));
  const base = { multiplier: HOTSPOT.multiplier };

  return withStationMeets(stationId, async (repo) => {
    const rows = await repo.load();
    const plan = planMeet(rows, { riderId: rider.id, code: input.code, now, holders });
    switch (plan.kind) {
      case "code_not_found":
        throw new HttpError(404, "code_not_found", `No one at ${name} is showing that code. Check it and try again.`);
      case "no_holder":
        throw new HttpError(403, "no_hotspot", `One of you needs ${name} as a hotspot to earn the bonus.`);
      case "deliver": {
        await repo.update({ ...plan.row, expiresAt: now });
        const partner = plan.row.partnerId ? await getRider(plan.row.partnerId) : null;
        return matched(plan.row, partner, plan.row.points);
      }
      case "expired":
        await repo.remove(plan.row.id);
        return {
          ...base, status: "expired", code: plan.row.code, expiresAt: new Date(plan.row.expiresAt).toISOString(), pointsAwarded: 0,
          message: "No one bumped in time. Tap Bump to try again.",
        };
      case "wait": {
        const row = plan.mine
          ? { ...plan.mine, lat: input.lat, lng: input.lng, lastSeenAt: now }
          : await repo.insert({
              riderId: rider.id, hotspotId: input.hotspotId, stationId, code: newCode(rows, now), lat: input.lat, lng: input.lng,
              partnerId: null, points: 0, lastSeenAt: now, expiresAt: now + MEET.codeTtlMs, matchedAt: null,
            });
        if (plan.mine) await repo.update(row);
        return {
          ...base, status: "waiting", code: row.code, expiresAt: new Date(row.expiresAt).toISOString(), pointsAwarded: 0,
          message: `Waiting at ${name}. Have the other rider tap Bump now, or enter your code ${row.code}.`,
        };
      }
      case "match": {
        const partner = await getRider(plan.partner.riderId);
        if (!partner) throw new HttpError(404, "code_not_found", "That rider is no longer playing.");
        const award = (r: RiderRow, other: string) =>
          awardBonus({ riderId: r.id, teamRouteId: r.homeTeamRouteId, type: "hotspot_meet", amount: HOTSPOT.meetPoints, ref: meetRef(r.id, other, stationId, now) });
        const mine = await award(rider, partner.id);
        const theirs = await award(partner, rider.id);
        await repo.update({ ...plan.partner, partnerId: rider.id, matchedAt: now, points: theirs.pointsAwarded, expiresAt: now + MEET.deliveryMs });
        const myRow = { partnerId: partner.id, matchedAt: now, points: mine.pointsAwarded, lastSeenAt: now, expiresAt: now };
        const saved = plan.mine
          ? { ...plan.mine, ...myRow, lat: input.lat, lng: input.lng }
          : await repo.insert({ riderId: rider.id, hotspotId: input.hotspotId, stationId, code: newCode(rows, now), lat: input.lat, lng: input.lng, ...myRow });
        if (plan.mine) await repo.update(saved);
        return matched(saved, partner, mine.pointsAwarded);
      }
    }
  });

  function matched(row: MeetRow, partner: RiderRow | null, points: number): MeetResponse {
    const who = partner ? `${partner.displayName} (${teamName(partner.homeTeamRouteId)})` : "another rider";
    return {
      ...base,
      status: "matched",
      code: row.code,
      expiresAt: new Date(row.expiresAt).toISOString(),
      ...(partner ? { partner: { riderId: partner.id, displayName: partner.displayName, homeTeamRouteId: partner.homeTeamRouteId } } : {}),
      pointsAwarded: points,
      message:
        points > 0
          ? `You met ${who} at ${name}! +${points} points (${HOTSPOT.multiplier}x hotspot bonus).`
          : `You already met ${who} at ${name} today. Meet someone new for another ${HOTSPOT.multiplier}x bonus.`,
    };
  }
}
