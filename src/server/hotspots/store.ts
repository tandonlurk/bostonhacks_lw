// Hotspot + meet persistence (owner: A, T25). Postgres when DATABASE_URL is set, else in-memory.
// Tables: db/migrations/20261121_1700_social.sql (hotspots, hotspot_meets).
import type { Hotspot } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import type { MeetRow } from "./meet";

type Sql = ReturnType<typeof getSql>;
// postgres.js passes a TransactionSql to begin(); it is call-compatible with Sql for our queries.
type Tx = Sql;

export interface HolderRow {
  riderId: string;
  stationId: string;
  hotspotId: string;
}

interface Mem {
  hotspots: Map<string, { riderId: string; hotspot: Hotspot }>;
  meets: MeetRow[];
  nextMeetId: number;
  locks: Map<string, Promise<unknown>>;
}
const g = globalThis as unknown as { __tcityHotspotMem?: Mem };
const mem = (): Mem => (g.__tcityHotspotMem ??= { hotspots: new Map(), meets: [], nextMeetId: 1, locks: new Map() });

/** Serialize work per key within this instance (memory mode). */
async function memLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const m = mem();
  const prev = m.locks.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  m.locks.set(key, run);
  try {
    return await run;
  } finally {
    if (m.locks.get(key) === run) m.locks.delete(key);
  }
}

const live = (h: Hotspot, now: number) => Date.parse(h.expiresAt) > now;

// ---------- hotspots ----------
export async function listRiderHotspots(riderId: string, now = Date.now()): Promise<Hotspot[]> {
  if (hasDb()) {
    const rows = await getSql()<{ data: Hotspot }[]>`
      select data from hotspots where rider_id = ${riderId} and expires_at > ${new Date(now)} order by created_at, id`;
    return rows.map((r) => r.data);
  }
  return [...mem().hotspots.values()].filter((h) => h.riderId === riderId && live(h.hotspot, now)).map((h) => h.hotspot);
}

export async function listHolders(now = Date.now()): Promise<HolderRow[]> {
  if (hasDb()) {
    return await getSql()<HolderRow[]>`
      select rider_id as "riderId", station_id as "stationId", id as "hotspotId"
      from hotspots where expires_at > ${new Date(now)}`;
  }
  return [...mem().hotspots.values()]
    .filter((h) => live(h.hotspot, now))
    .map((h) => ({ riderId: h.riderId, stationId: h.hotspot.stationId, hotspotId: h.hotspot.id }));
}

export async function getHotspot(id: string): Promise<{ riderId: string; hotspot: Hotspot } | null> {
  if (hasDb()) {
    const rows = await getSql()<{ rider_id: string; data: Hotspot }[]>`select rider_id, data from hotspots where id = ${id}`;
    return rows[0] ? { riderId: rows[0].rider_id, hotspot: rows[0].data } : null;
  }
  return mem().hotspots.get(id) ?? null;
}

/**
 * Run `fn` with the rider's hotspots locked (generation must not race itself). `fn` gets the rider's
 * live hotspots and returns either null (keep them) or a replacement set.
 */
export async function withRiderHotspots(
  riderId: string,
  fn: (current: Hotspot[]) => Promise<Hotspot[] | null>,
): Promise<Hotspot[]> {
  if (hasDb()) {
    return await getSql().begin(async (tx) => {
      const sql = tx as unknown as Tx;
      await sql`select pg_advisory_xact_lock(hashtext(${`hotspots:${riderId}`}))`;
      const now = new Date();
      const current = (await sql<{ data: Hotspot }[]>`
        select data from hotspots where rider_id = ${riderId} and expires_at > ${now} order by created_at, id`).map((r) => r.data);
      const next = await fn(current);
      if (!next) return current;
      await sql`update hotspots set expires_at = ${now} where rider_id = ${riderId} and expires_at > ${now}`;
      for (const h of next) {
        await sql`
          insert into hotspots (id, rider_id, station_id, from_station_id, to_station_id, data, created_at, expires_at)
          values (${h.id}, ${riderId}, ${h.stationId}, ${h.fromStationId}, ${h.toStationId},
                  ${sql.json(JSON.parse(JSON.stringify(h)))}, ${h.createdAt}, ${h.expiresAt})`;
      }
      return next;
    });
  }
  return memLock(`hotspots:${riderId}`, async () => {
    const m = mem();
    const now = Date.now();
    const current = [...m.hotspots.values()].filter((h) => h.riderId === riderId && live(h.hotspot, now)).map((h) => h.hotspot);
    const next = await fn(current);
    if (!next) return current;
    for (const h of current) m.hotspots.delete(h.id);
    for (const h of next) m.hotspots.set(h.id, { riderId, hotspot: h });
    // Drop long-expired hotspots so memory stays small.
    for (const [id, h] of m.hotspots) if (Date.parse(h.hotspot.expiresAt) < now - 86_400_000) m.hotspots.delete(id);
    return next;
  });
}

// ---------- meets ----------
export interface MeetRepo {
  /** requests at the station that are open, recently expired, or recently matched */
  load(): Promise<MeetRow[]>;
  insert(row: Omit<MeetRow, "id">): Promise<MeetRow>;
  update(row: MeetRow): Promise<void>;
  remove(id: number): Promise<void>;
}

type MeetDbRow = {
  id: string;
  rider_id: string;
  hotspot_id: string;
  station_id: string;
  code: string;
  lat: number;
  lng: number;
  partner_id: string | null;
  points: number;
  created_at: Date;
  expires_at: Date;
  matched_at: Date | null;
};
const meetFromDb = (r: MeetDbRow): MeetRow => ({
  id: Number(r.id),
  riderId: r.rider_id,
  hotspotId: r.hotspot_id,
  stationId: r.station_id,
  code: r.code,
  lat: r.lat,
  lng: r.lng,
  partnerId: r.partner_id,
  points: r.points,
  lastSeenAt: r.created_at.getTime(),
  expiresAt: r.expires_at.getTime(),
  matchedAt: r.matched_at ? r.matched_at.getTime() : null,
});

const RECENT_MS = 5 * 60_000;

/** Run `fn` with the station's meet requests locked (pg_advisory_xact_lock in Postgres). */
export async function withStationMeets<T>(stationId: string, fn: (repo: MeetRepo) => Promise<T>): Promise<T> {
  if (hasDb()) {
    return (await getSql().begin(async (tx) => {
      const sql = tx as unknown as Tx;
      await sql`select pg_advisory_xact_lock(hashtext(${`hotspot_meet:${stationId}`}))`;
      const repo: MeetRepo = {
        async load() {
          const since = new Date(Date.now() - RECENT_MS);
          const rows = await sql<MeetDbRow[]>`
            select * from hotspot_meets where station_id = ${stationId} and (expires_at > ${since} or created_at > ${since})
            order by id`;
          return rows.map(meetFromDb);
        },
        async insert(row) {
          const [r] = await sql<MeetDbRow[]>`
            insert into hotspot_meets (rider_id, hotspot_id, station_id, code, lat, lng, partner_id, points, created_at, expires_at, matched_at)
            values (${row.riderId}, ${row.hotspotId}, ${row.stationId}, ${row.code}, ${row.lat}, ${row.lng}, ${row.partnerId},
                    ${row.points}, ${new Date(row.lastSeenAt)}, ${new Date(row.expiresAt)},
                    ${row.matchedAt === null ? null : new Date(row.matchedAt)})
            returning *`;
          return meetFromDb(r);
        },
        async update(row) {
          await sql`
            update hotspot_meets set lat = ${row.lat}, lng = ${row.lng}, partner_id = ${row.partnerId}, points = ${row.points},
              created_at = ${new Date(row.lastSeenAt)}, expires_at = ${new Date(row.expiresAt)},
              matched_at = ${row.matchedAt === null ? null : new Date(row.matchedAt)}
            where id = ${row.id}`;
        },
        async remove(id) {
          await sql`delete from hotspot_meets where id = ${id}`;
        },
      };
      return fn(repo);
    })) as T;
  }
  return memLock(`meet:${stationId}`, async () => {
    const m = mem();
    const now = Date.now();
    m.meets = m.meets.filter((r) => r.expiresAt > now - 86_400_000 || r.lastSeenAt > now - 86_400_000);
    const repo: MeetRepo = {
      async load() {
        return m.meets
          .filter((r) => r.stationId === stationId && (r.expiresAt > now - RECENT_MS || r.lastSeenAt > now - RECENT_MS))
          .map((r) => ({ ...r }));
      },
      async insert(row) {
        const saved = { ...row, id: m.nextMeetId++ };
        m.meets.push(saved);
        return { ...saved };
      },
      async update(row) {
        const i = m.meets.findIndex((r) => r.id === row.id);
        if (i >= 0) m.meets[i] = { ...row };
      },
      async remove(id) {
        m.meets = m.meets.filter((r) => r.id !== id);
      },
    };
    return fn(repo);
  });
}
