// Friends (owner: A). Three example friends on different teams. Each one is pinned to a real,
// moving train on their line (live MBTA data), so tracking them on the map looks alive. With no
// live data they hang out at their usual station.
import type { Friend, FriendsResponse, PlayableTeamId } from "@/contracts";
import { TEAMS } from "@/contracts";
import { routeLabel } from "@/server/rides/engine";
import { getStopIndex, getStopOrder } from "@/server/mbta/stops";
import { getVehicleSnapshot, type LiveVehicle } from "@/server/mbta/vehicles";

const FRIENDS: { id: string; name: string; team: PlayableTeamId; home: { stationId: string; name: string; lat: number; lng: number }; basePoints: number; streakDays: number }[] = [
  { id: "frd_maya", name: "Maya Chen", team: "Orange", home: { stationId: "place-bbsta", name: "Back Bay", lat: 42.34735, lng: -71.075727 }, basePoints: 212, streakDays: 6 },
  { id: "frd_jordan", name: "Jordan Reyes", team: "Red", home: { stationId: "place-knncl", name: "Kendall/MIT", lat: 42.362491, lng: -71.086176 }, basePoints: 168, streakDays: 3 },
  { id: "frd_priya", name: "Priya Patel", team: "Blue", home: { stationId: "place-aqucl", name: "Aquarium", lat: 42.359784, lng: -71.051652 }, basePoints: 241, streakDays: 9 },
];

/** friendId -> vehicle they're "on", kept while that vehicle is in service. */
const g = globalThis as unknown as { __tcityFriendRides?: Map<string, string> };
const rides = () => (g.__tcityFriendRides ??= new Map());

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

function pickVehicle(friendId: string, team: PlayableTeamId, vehicles: LiveVehicle[]): LiveVehicle | null {
  const mine = vehicles.filter((v) => v.teamRouteId === team);
  if (!mine.length) return null;
  const current = rides().get(friendId);
  const kept = current ? mine.find((v) => v.id === current) : undefined;
  if (kept) return kept;
  const moving = mine.filter((v) => v.currentStatus !== "STOPPED_AT" || (v.speed ?? 0) > 1);
  const pool = moving.length ? moving : mine;
  const v = pool[hash(friendId + Math.floor(Date.now() / 3_600_000)) % pool.length];
  rides().set(friendId, v.id);
  return v;
}

export async function getFriends(): Promise<FriendsResponse> {
  const now = Date.now();
  const [snap, index] = await Promise.all([
    getVehicleSnapshot().catch(() => ({ vehicles: [] as LiveVehicle[] })),
    getStopIndex().catch(() => null),
  ]);
  const name = (id: string | null) => (id ? (index?.byId.get(id)?.name ?? null) : null);
  // Points tick up slowly through the day so the list feels live.
  const dayMinutes = Math.floor((now % 86_400_000) / 60_000);

  const friends: Friend[] = await Promise.all(
    FRIENDS.map(async (f): Promise<Friend> => {
      const base = { id: f.id, name: f.name, initials: initials(f.name), teamRouteId: f.team, points: f.basePoints + Math.floor(dayMinutes / 6), streakDays: f.streakDays };
      const v = pickVehicle(f.id, f.team, snap.vehicles);
      if (!v) {
        return { ...base, status: "at_station", headline: `At ${f.home.name}`, detail: `${TEAMS[f.team].name} · waiting for a train`, lat: f.home.lat, lng: f.home.lng, vehicleId: null };
      }
      const order = await getStopOrder(v.routeId, v.directionId).catch(() => [] as string[]);
      const toward = name(order.at(-1) ?? null);
      const stop = name(v.stopId);
      const detail = !stop ? "On the move" : v.currentStatus === "STOPPED_AT" ? `Stopped at ${stop}` : `Next stop ${stop}`;
      return {
        ...base,
        status: "riding",
        headline: `Riding the ${routeLabel(v.routeId)}${toward ? ` toward ${toward}` : ""}`,
        detail,
        lat: v.lat,
        lng: v.lng,
        vehicleId: v.id,
      };
    }),
  );
  return { updatedAt: new Date(now).toISOString(), friends };
}
