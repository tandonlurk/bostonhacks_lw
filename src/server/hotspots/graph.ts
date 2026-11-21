// MBTA network graph for hotspots (owner: A, T25). Pure: no IO and no runtime imports, so it runs
// under `node scripts/test-hotspots.mjs`. Callers pass in the static stop snapshot
// (src/server/mbta/static-stops.json) and a route -> line mapping.
//
// Nodes are stations; edges join consecutive stations of every route/direction order and are
// labeled with the *line* (team id: Green branches are one line, every Silver route is "Silver").
// Path cost = 1 per hop + a transfer penalty whenever the line changes.

export interface StationInfo {
  name: string;
  lat: number;
  lng: number;
}

export interface StaticStops {
  stations: Record<string, StationInfo>;
  /** "<mbtaRouteId>:<directionId>" -> ordered station ids */
  orders: Record<string, string[]>;
  parentOf?: Record<string, string>;
}

export interface Edge {
  to: string;
  line: string;
}

export interface Graph {
  stations: Record<string, StationInfo>;
  adj: Map<string, Edge[]>;
  /** lines serving each station */
  linesAt: Map<string, Set<string>>;
  lineNames: Record<string, string>;
  parentOf: Record<string, string>;
}

export interface Leg {
  line: string;
  from: string;
  to: string;
  stations: string[];
}

export interface PathResult {
  stations: string[];
  legs: Leg[];
  cost: number;
  hops: number;
  transfers: number;
}

export const TRANSFER_PENALTY = 3;
/** street stops this close to a station are linked to it */
export const LINK_RADIUS_M = 250;

/**
 * Fix-ups for route orders that merge branches into one list. The MBTA's Red Line stop order runs
 * Ashmont branch then Braintree branch, which would invent an Ashmont <-> North Quincy edge.
 */
export const DEFAULT_EDGE_FIXES: { remove: [string, string][]; add: { a: string; b: string; line: string }[] } = {
  remove: [["place-asmnl", "place-nqncy"]],
  add: [{ a: "place-jfk", b: "place-nqncy", line: "Red" }],
};

export function buildGraph(
  data: StaticStops,
  lineOf: (mbtaRouteId: string) => string | null,
  lineNames: Record<string, string>,
  fixes = DEFAULT_EDGE_FIXES,
): Graph {
  const adj = new Map<string, Edge[]>();
  const linesAt = new Map<string, Set<string>>();
  const removed = new Set(fixes.remove.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
  const addEdge = (a: string, b: string, line: string) => {
    if (a === b || removed.has(`${a}|${b}`) || !data.stations[a] || !data.stations[b]) return;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const list = adj.get(x) ?? [];
      if (!list.some((e) => e.to === y && e.line === line)) list.push({ to: y, line });
      adj.set(x, list);
      const lines = linesAt.get(x) ?? new Set<string>();
      lines.add(line);
      linesAt.set(x, lines);
    }
  };
  for (const [key, order] of Object.entries(data.orders)) {
    const line = lineOf(key.slice(0, key.lastIndexOf(":")));
    if (!line) continue;
    for (let i = 1; i < order.length; i++) addEdge(order[i - 1], order[i], line);
  }
  for (const e of fixes.add) addEdge(e.a, e.b, e.line);
  // Street-level Silver Line terminals (SL4 Essex St, SL5 Temple Pl) aren't children of a station;
  // link each to a station within a short walk so those routes connect. Only terminals, so the
  // graph doesn't invent bus shortcuts between nearby downtown stations.
  const stationIds = [...adj.keys()].filter((id) => id.startsWith("place-"));
  const terminals = new Set(Object.values(data.orders).flatMap((o) => (o.length ? [o[0], o[o.length - 1]] : [])));
  for (const stop of [...adj.keys()]) {
    if (stop.startsWith("place-") || !terminals.has(stop)) continue;
    let near: { id: string; m: number } | null = null;
    for (const id of stationIds) {
      const m = haversineM(data.stations[stop], data.stations[id]);
      if (m <= LINK_RADIUS_M && (!near || m < near.m)) near = { id, m };
    }
    if (near) for (const line of linesAt.get(stop) ?? []) addEdge(stop, near.id, line);
  }
  return { stations: data.stations, adj, linesAt, lineNames, parentOf: data.parentOf ?? {} };
}

/** Map a child stop / platform id to its parent station when the snapshot knows it. */
export function normalizeStation(g: Graph, id: string): string | null {
  if (g.adj.has(id)) return id;
  const parent = g.parentOf[id];
  return parent && g.adj.has(parent) ? parent : null;
}

export const lineName = (g: Graph, line: string) => g.lineNames[line] ?? `${line} Line`;
export const stationName = (g: Graph, id: string) => g.stations[id]?.name ?? id;
export const isTransferStation = (g: Graph, id: string) => (g.linesAt.get(id)?.size ?? 0) >= 2;

// ---------- Dijkstra over (station, line) states ----------
const SEP = "\u0000";
const key = (station: string, line: string) => `${station}${SEP}${line}`;
const unkey = (k: string): [string, string] => {
  const i = k.indexOf(SEP);
  return [k.slice(0, i), k.slice(i + 1)];
};

export interface Tree {
  source: string;
  dist: Map<string, number>;
  prev: Map<string, string | null>;
}

/** Shortest-path tree from `source`. Edges are symmetric, so a tree from D also gives X -> D. */
export function shortestTree(g: Graph, source: string, penalty = TRANSFER_PENALTY): Tree {
  const start = key(source, "");
  const dist = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string | null>([[start, null]]);
  const done = new Set<string>();
  // The graph is small (a few hundred states), so a linear-scan frontier is plenty.
  const frontier = new Set<string>([start]);
  while (frontier.size) {
    let best = "";
    let bestD = Infinity;
    for (const k of frontier) {
      const d = dist.get(k)!;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    frontier.delete(best);
    done.add(best);
    const [station, line] = unkey(best);
    for (const e of g.adj.get(station) ?? []) {
      const nk = key(e.to, e.line);
      if (done.has(nk)) continue;
      const nd = bestD + 1 + (line && line !== e.line ? penalty : 0);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, best);
        frontier.add(nk);
      }
    }
  }
  return { source, dist, prev };
}

/** Best state at `station` in a tree: [cost, line]. */
function statesAt(tree: Tree, g: Graph, station: string): [number, string][] {
  if (station === tree.source) return [[0, ""]];
  const out: [number, string][] = [];
  for (const line of g.linesAt.get(station) ?? []) {
    const d = tree.dist.get(key(station, line));
    if (d !== undefined) out.push([d, line]);
  }
  return out;
}

/** Edge sequence from the tree source to `station` arriving on `line`: [station, lineIntoIt][]. */
function walk(tree: Tree, station: string, line: string): [string, string][] {
  const seq: [string, string][] = [];
  let k: string | null | undefined = station === tree.source ? key(station, "") : key(station, line);
  while (k) {
    seq.push(unkey(k));
    k = tree.prev.get(k);
  }
  return seq.reverse();
}

function toPath(seq: [string, string][], cost: number): PathResult {
  const stations = seq.map(([s]) => s);
  const legs: Leg[] = [];
  for (let i = 1; i < seq.length; i++) {
    const [s, line] = seq[i];
    const last = legs[legs.length - 1];
    if (last && last.line === line) {
      last.to = s;
      last.stations.push(s);
    } else legs.push({ line, from: seq[i - 1][0], to: s, stations: [seq[i - 1][0], s] });
  }
  return { stations, legs, cost, hops: seq.length - 1, transfers: Math.max(0, legs.length - 1) };
}

export function pathTo(g: Graph, tree: Tree, station: string): PathResult | null {
  let best: [number, string] | null = null;
  for (const s of statesAt(tree, g, station)) if (!best || s[0] < best[0]) best = s;
  return best ? toPath(walk(tree, station, best[1]), best[0]) : null;
}

export function shortestPath(g: Graph, from: string, to: string, penalty = TRANSFER_PENALTY): PathResult | null {
  return pathTo(g, shortestTree(g, from, penalty), to);
}

/**
 * Cheapest O -> X -> D path from trees rooted at O and D. With `simple`, paths that revisit a
 * station (other than X) are rejected, so X is a genuine via-station rather than an out-and-back.
 */
export function viaPath(
  g: Graph,
  fromTree: Tree,
  toTree: Tree,
  via: string,
  opts: { simple?: boolean; penalty?: number } = {},
): PathResult | null {
  const penalty = opts.penalty ?? TRANSFER_PENALTY;
  let best: PathResult | null = null;
  for (const [d1, l1] of statesAt(fromTree, g, via)) {
    for (const [d2, l2] of statesAt(toTree, g, via)) {
      const cost = d1 + d2 + (l1 && l2 && l1 !== l2 ? penalty : 0);
      if (best && cost >= best.cost) continue;
      const first = walk(fromTree, via, l1);
      // Tree from D walks D -> X; reverse it to X -> D. The line on each edge moves to its far end.
      const back = walk(toTree, via, l2).reverse();
      const second: [string, string][] = back.slice(1).map(([s], i) => [s, back[i][1]]);
      const seq = [...first, ...second];
      if (opts.simple && new Set(seq.map(([s]) => s)).size !== seq.length) continue;
      best = toPath(seq, cost);
    }
  }
  return best;
}

/** Hop distance from any station in `sources`, up to `maxHops`. */
export function hopsFrom(g: Graph, sources: string[], maxHops: number): Map<string, number> {
  const seen = new Map<string, number>(sources.map((s) => [s, 0]));
  let layer = [...sources];
  for (let h = 1; h <= maxHops; h++) {
    const next: string[] = [];
    for (const s of layer)
      for (const e of g.adj.get(s) ?? [])
        if (!seen.has(e.to)) {
          seen.set(e.to, h);
          next.push(e.to);
        }
    layer = next;
  }
  return seen;
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
