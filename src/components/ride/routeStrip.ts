// Living Route Card data: which line, which way, where along it the rider is.
// Pure derivation from static geometry (mbta-geo LINES/STATIONS), the demo stepper spot, the live ride
// session (teamRouteId / nextStopId) and the current fix. No network, no contract changes.
import { LINES, STATIONS, type GeoStation } from "@/components/map/mbta-geo";
import type { TeamRouteId } from "@/contracts/routes";
import type { DemoSpot } from "./demoLocation";
import { bearingDeg, distanceM, nearestPlace, type LatLng } from "./geo";
import { angleDelta } from "./navCamera";

export interface RouteStrip {
  line: TeamRouteId;
  /** Full branch in travel order. */
  stops: GeoStation[];
  /** Index of the current (nearest) station in `stops`. */
  current: number;
  /** Meters from the fix to the current station. */
  distanceM: number;
  /** Close enough to call it "at" the station. */
  atStation: boolean;
}

const AT_STATION_M = 220;

/**
 * LINES stores some lines as connected segments (Green: trunk, Union spur, Copley-Kenmore link, then
 * B/C/D starting at Kenmore). Stitch each segment onto whatever it hangs from so every branch reads
 * end to end, then drop branches that are just a prefix of a longer one.
 */
function stitch(line: TeamRouteId): string[][] {
  const segs = LINES[line].map((seg) => seg.filter((id) => STATIONS[id]));
  const out: string[][] = [];
  segs.forEach((seg, i) => {
    if (seg.length < 2) return;
    if (i === 0) {
      out.push(seg);
      return;
    }
    let full = seg;
    const head = out.find((b) => b.indexOf(seg[0]) > 0);
    if (head) full = head.slice(0, head.indexOf(seg[0])).concat(full);
    const last = seg[seg.length - 1];
    const tail = out.find((b) => b.indexOf(last) >= 0 && b.indexOf(last) < b.length - 1);
    if (tail && !head) full = full.concat(tail.slice(tail.indexOf(last) + 1));
    out.push(full);
  });
  return out.filter((b, i) => !out.some((o, j) => j !== i && o.length > b.length && b.every((id, k) => o[k] === id)));
}

const BRANCH_CACHE = new Map<TeamRouteId, string[][]>();
function branchesFor(line: TeamRouteId): string[][] {
  let b = BRANCH_CACHE.get(line);
  if (!b) {
    b = stitch(line);
    BRANCH_CACHE.set(line, b);
  }
  return b;
}

function nearestOnLine(line: TeamRouteId, p: LatLng): { id: string; d: number } | null {
  let best: { id: string; d: number } | null = null;
  for (const branch of branchesFor(line)) {
    for (const id of branch) {
      const d = distanceM(p, STATIONS[id]);
      if (!best || d < best.d) best = { id, d };
    }
  }
  return best;
}

/** Which way along `branch` (as stored) the rider heads: +1 toward the end, -1 toward the start. */
function directionFrom(branch: string[], at: number, heading: number | null): 1 | -1 {
  if (heading == null) return at >= branch.length - 1 ? -1 : 1;
  const here = STATIONS[branch[at]];
  const fwd = at < branch.length - 1 ? Math.abs(angleDelta(heading, bearingDeg(here, STATIONS[branch[at + 1]]))) : Infinity;
  const back = at > 0 ? Math.abs(angleDelta(heading, bearingDeg(here, STATIONS[branch[at - 1]]))) : Infinity;
  return back < fwd ? -1 : 1;
}

export interface StripInput {
  fix: LatLng & { heading: number | null };
  demo: DemoSpot | null;
  /** Line of the live ride (session.teamRouteId), when riding. */
  rideLine: TeamRouteId | null;
  nextStopId: string | null;
  homeTeam: TeamRouteId | null;
}

export function deriveRouteStrip({ fix, demo, rideLine, nextStopId, homeTeam }: StripInput): RouteStrip | null {
  // 1. Which line.
  let line: TeamRouteId | null = demo?.team ?? rideLine ?? null;
  if (!line) {
    const s = nearestPlace(fix);
    if (s) line = homeTeam && s.teams.includes(homeTeam) ? homeTeam : (s.teams.find((t) => t !== "Silver") ?? s.teams[0]);
  }
  if (!line) return null;

  // 2. Where on it.
  const here = demo ? { id: demo.stationId, d: 0 } : nearestOnLine(line, fix);
  if (!here) return null;
  const branches = branchesFor(line);
  const containing = branches.filter((b) => b.includes(here.id));
  if (!containing.length) return null;

  // 3. Which branch and which way.
  let branch = containing[0];
  let dir: 1 | -1 = 1;
  if (demo) {
    const end = demo.branchStops[demo.branchStops.length - 1];
    const start = demo.branchStops[0];
    branch = containing.find((b) => b.includes(end) && b.includes(start)) ?? branch;
    // The demo segment runs in the same order as its stitched branch.
    dir = demo.dir;
  } else if (nextStopId && nextStopId !== here.id) {
    branch = containing.find((b) => b.includes(nextStopId)) ?? branch;
    const a = branch.indexOf(here.id);
    const n = branch.indexOf(nextStopId);
    dir = n >= 0 && n < a ? -1 : 1;
  } else {
    dir = directionFrom(branch, branch.indexOf(here.id), fix.heading);
  }

  const ordered = dir === 1 ? branch : [...branch].reverse();
  const current = ordered.indexOf(here.id);
  return {
    line,
    stops: ordered.map((id) => STATIONS[id]),
    current,
    distanceM: here.d,
    atStation: here.d <= AT_STATION_M,
  };
}
