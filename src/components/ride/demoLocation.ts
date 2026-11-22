"use client";

// Hidden demo control (not shown in the UI): arrow keys move the rider between stations.
//   Left / Right  previous / next station on the current line branch
//   Up / Down     switch line branch (Red, Red Braintree, Orange, Blue, Green B/C/D/E...)
// While an override is set, the map dot and the ride session's GPS samples use it instead of
// real GPS. Press Escape to go back to real GPS.
import { useEffect, useState, useSyncExternalStore } from "react";
import { LINES, STATIONS } from "@/components/map/mbta-geo";
import type { TeamRouteId } from "@/contracts/routes";

export interface DemoSpot {
  lat: number;
  lng: number;
  stationId: string;
  name: string;
  heading: number | null;
  /** Line and branch stops the stepper is walking (for the Living Route Card). */
  team: TeamRouteId;
  branchStops: string[];
  /** Position in branchStops, and the last step direction (+1 = toward the end of branchStops). */
  index: number;
  dir: 1 | -1;
}

const BRANCHES: { team: TeamRouteId; stops: string[] }[] = (Object.keys(LINES) as TeamRouteId[])
  .filter((t) => t !== "Silver")
  .flatMap((team) => LINES[team].map((stops) => ({ team, stops: stops.filter((id) => STATIONS[id]) })))
  .filter((b) => b.stops.length > 1);

let spot: DemoSpot | null = null;
/** Last points award from a demo hop, for the "+5 pts" pop on the Ride screen. */
export interface DemoAward { id: number; points: number; teamRouteId: TeamRouteId; stationName: string }
let award: DemoAward | null = null;
let awardSeq = 0;
let branch = 0;
let index = 0;
let dir: 1 | -1 = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Current override, or null to use real GPS. Safe to call from render loops and timers. */
export function getDemoSpot(): DemoSpot | null {
  return spot;
}

/** Demo simulation: a hop to an adjacent station earns points (server checks sim + adjacency). */
function awardHop(fromStationId: string, toStationId: string) {
  const riderId = typeof window !== "undefined" ? window.localStorage.getItem("tcity.riderId") : null;
  if (!riderId) return;
  fetch("/api/rides/demo-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, fromStationId, toStationId }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((b: { pointsAwarded: number; teamRouteId: TeamRouteId; stationName: string } | null) => {
      if (!b || b.pointsAwarded <= 0) return;
      award = { id: ++awardSeq, points: b.pointsAwarded, teamRouteId: b.teamRouteId, stationName: b.stationName };
      emit();
    })
    .catch(() => {});
}

function moveTo(nextBranch: number, nextIndex: number) {
  const nb = (nextBranch + BRANCHES.length) % BRANCHES.length;
  const sameBranch = nb === branch;
  branch = nb;
  const stops = BRANCHES[branch].stops;
  const prevId = spot?.stationId;
  const clamped = Math.max(0, Math.min(stops.length - 1, nextIndex));
  if (sameBranch && prevId && clamped !== index) dir = clamped > index ? 1 : -1;
  index = clamped;
  const s = STATIONS[stops[index]];
  const prev = prevId ? STATIONS[prevId] : null;
  const heading = prev && prev.id !== s.id ? (Math.atan2(s.lng - prev.lng, s.lat - prev.lat) * 180) / Math.PI : (spot?.heading ?? null);
  spot = {
    lat: s.lat,
    lng: s.lng,
    stationId: s.id,
    name: s.name,
    heading: heading === null ? null : (heading + 360) % 360,
    team: BRANCHES[branch].team,
    branchStops: stops,
    index,
    dir,
  };
  emit();
}

/** First press: snap to the station nearest `here`, preferring the rider's own line. */
function start(team: TeamRouteId | null, here: { lat: number; lng: number } | null) {
  let best = { b: Math.max(0, BRANCHES.findIndex((x) => x.team === team)), i: 0, d: Infinity };
  if (here) {
    BRANCHES.forEach((br, b) => {
      if (team && br.team !== team) return;
      br.stops.forEach((id, i) => {
        const s = STATIONS[id];
        const d = (s.lat - here.lat) ** 2 + (s.lng - here.lng) ** 2;
        if (d < best.d) best = { b, i, d };
      });
    });
  }
  moveTo(best.b, best.i);
}

function step(direction: 1 | -1) {
  if (!spot) return;
  const from = spot.stationId;
  moveTo(branch, index + direction);
  if (spot.stationId !== from) awardHop(from, spot.stationId);
}

function clearSpot() {
  spot = null;
  emit();
}

/** Mount once (Ride screen). Listens for arrow keys; ignores typing in inputs. */
export function useDemoStepper(team: TeamRouteId | null, here: () => { lat: number; lng: number } | null = () => null) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (!spot) start(team, here());
    const timer = window.setInterval(() => {
      if (!spot) return;
      const last = spot.branchStops.length - 1;
      step(index === last ? -1 : index === 0 ? 1 : dir);
    }, 4000);
    return () => {
      window.clearInterval(timer);
      clearSpot();
    };
  }, [playing, team, here]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && spot) {
        setPlaying(false);
        clearSpot();
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      if (!spot) return start(team, here());
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        step(e.key === "ArrowRight" ? 1 : -1);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        // Switch branch, landing on the nearest station of the new branch.
        const nb = (branch + (e.key === "ArrowDown" ? 1 : -1) + BRANCHES.length) % BRANCHES.length;
        const cur = spot;
        const stops = BRANCHES[nb].stops;
        let best = 0;
        let bestD = Infinity;
        stops.forEach((id, i) => {
          const s = STATIONS[id];
          const d = (s.lat - cur.lat) ** 2 + (s.lng - cur.lng) ** 2;
          if (d < bestD) [bestD, best] = [d, i];
        });
        moveTo(nb, best);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [team, here]);

  return { playing, togglePlayback: () => setPlaying(value => !value) };
}

/** React subscription to the override (re-renders when it moves). */
export function useDemoSpot(): DemoSpot | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => spot,
    () => null,
  );
}

/** React subscription to the latest demo hop award (null until the first one). */
export function useDemoAward(): DemoAward | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => award,
    () => null,
  );
}
