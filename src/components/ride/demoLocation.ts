"use client";

// Hidden demo control (not shown in the UI): arrow keys move the rider between stations.
//   Left / Right  previous / next station on the current line branch
//   Up / Down     switch line branch (Red, Red Braintree, Orange, Blue, Green B/C/D/E...)
// While an override is set, the map dot and the ride session's GPS samples use it instead of
// real GPS. Press Escape to go back to real GPS.
import { useEffect, useSyncExternalStore } from "react";
import { LINES, STATIONS } from "@/components/map/mbta-geo";
import type { TeamRouteId } from "@/contracts/routes";

export interface DemoSpot {
  lat: number;
  lng: number;
  stationId: string;
  name: string;
  heading: number | null;
}

const BRANCHES: { team: TeamRouteId; stops: string[] }[] = (Object.keys(LINES) as TeamRouteId[])
  .filter((t) => t !== "Silver")
  .flatMap((team) => LINES[team].map((stops) => ({ team, stops: stops.filter((id) => STATIONS[id]) })))
  .filter((b) => b.stops.length > 1);

let spot: DemoSpot | null = null;
let branch = 0;
let index = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Current override, or null to use real GPS. Safe to call from render loops and timers. */
export function getDemoSpot(): DemoSpot | null {
  return spot;
}

function moveTo(nextBranch: number, nextIndex: number) {
  branch = (nextBranch + BRANCHES.length) % BRANCHES.length;
  const stops = BRANCHES[branch].stops;
  const prevId = spot?.stationId;
  index = Math.max(0, Math.min(stops.length - 1, nextIndex));
  const s = STATIONS[stops[index]];
  const prev = prevId ? STATIONS[prevId] : null;
  const heading = prev && prev.id !== s.id ? (Math.atan2(s.lng - prev.lng, s.lat - prev.lat) * 180) / Math.PI : (spot?.heading ?? null);
  spot = { lat: s.lat, lng: s.lng, stationId: s.id, name: s.name, heading: heading === null ? null : (heading + 360) % 360 };
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

/** Mount once (Ride screen). Listens for arrow keys; ignores typing in inputs. */
export function useDemoStepper(team: TeamRouteId | null, here: () => { lat: number; lng: number } | null = () => null) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && spot) {
        spot = null;
        emit();
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      if (!spot) return start(team, here());
      if (e.key === "ArrowRight") moveTo(branch, index + 1);
      if (e.key === "ArrowLeft") moveTo(branch, index - 1);
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
