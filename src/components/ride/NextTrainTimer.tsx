"use client";

// Small "next train" countdown for the station the rider is at (GET /api/predictions).
import { useEffect, useState } from "react";
import { TEAMS } from "@/contracts/routes";
import type { TeamRouteId } from "@/contracts/routes";
import { USE_MOCKS } from "@/hooks/useMocks";

interface NextTrain { routeId: string; teamRouteId: TeamRouteId; directionId: 0 | 1; arrivalAt: string }

function useNextTrains(stopId: string | null): NextTrain[] {
  const [state, setState] = useState<{ stopId: string; trains: NextTrain[] } | null>(null);
  useEffect(() => {
    if (!stopId || USE_MOCKS) return;
    let cancelled = false;
    const load = () =>
      fetch(`/api/predictions?stopId=${encodeURIComponent(stopId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b: { trains?: NextTrain[] } | null) => {
          if (!cancelled && b?.trains) setState({ stopId, trains: b.trains });
        })
        .catch(() => {});
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stopId]);
  return state && state.stopId === stopId ? state.trains : [];
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function NextTrainTimer({ stopId }: { stopId: string | null }) {
  const trains = useNextTrains(stopId);
  const now = useNow(1000);
  const next = trains.find((t) => Date.parse(t.arrivalAt) > now - 15_000);
  if (!next) return null;
  const secs = Math.max(0, Math.round((Date.parse(next.arrivalAt) - now) / 1000));
  const label = secs <= 30 ? "Arriving" : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <p
      role="timer"
      aria-live="off"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "6px auto 0", padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,0.07)", fontSize: 13 }}
    >
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: TEAMS[next.teamRouteId]?.color ?? "#fff" }} />
      <span>Next {TEAMS[next.teamRouteId]?.name ?? "train"}</span>
      <span className="num" style={{ fontWeight: 700, color: "var(--accent)" }}>{label}</span>
    </p>
  );
}
