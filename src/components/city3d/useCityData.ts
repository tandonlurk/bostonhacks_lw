"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DistrictsResponse, LeaderboardResponse } from "@/contracts";
import { TEAMS, TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { useDistricts } from "@/hooks/useDistricts";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { Burst } from "./CityScene";
import type { TeamStat } from "./model";

type Bonus = Partial<Record<TeamRouteId, number>>;

/**
 * Demo flags via `?preview=live,empty`:
 * - live: simulates riders scoring every few seconds (grow animation and +N bubbles without real trains)
 * - empty: ignores API points so you can watch the city grow from a quiet low-rise start
 * Purely client-side; nothing is sent anywhere.
 */
function usePreviewFlags(): Set<string> {
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new Set((new URLSearchParams(search).get("preview") ?? "").split(",")), [search]);
}

function mergeStats(districts: DistrictsResponse | null, lb: LeaderboardResponse | null, bonus: Bonus, empty: boolean): TeamStat[] {
  const stats = TEAM_ROUTE_IDS.map((team): TeamStat => {
    const d = districts?.find((x) => x.teamRouteId === team);
    const l = lb?.teams.find((x) => x.teamRouteId === team);
    return {
      team,
      points: Math.round((empty ? 0 : (l?.points ?? d?.totalPoints ?? 0)) + (bonus[team] ?? 0)),
      rank: 0,
      riders: l?.riders ?? 0,
      districtName: d?.name ?? TEAMS[team].districtName,
      tiers: (empty ? [] : (d?.lots ?? [])).map((lot) => lot.tier as number).sort((a, b) => b - a),
    };
  });
  // Rank locally so the preview bonus (and any lag between the two endpoints) stays consistent.
  [...stats]
    .sort((a, b) => b.points - a.points || TEAM_ROUTE_IDS.indexOf(a.team) - TEAM_ROUTE_IDS.indexOf(b.team))
    .forEach((s, i) => (s.rank = i + 1));
  return stats;
}

function usePreviewBonus(live: boolean): Bonus {
  const [bonus, setBonus] = useState<Bonus>({});
  useEffect(() => {
    if (!live) return;
    const weights: [TeamRouteId, number][] = [
      ["Red", 3],
      ["Orange", 2],
      ["Blue", 1.4],
      ["Green", 2.4],
      ["Silver", 1],
    ];
    const total = weights.reduce((s, w) => s + w[1], 0);
    const id = window.setInterval(() => {
      let r = Math.random() * total;
      const team = weights.find((w) => (r -= w[1]) <= 0)?.[0] ?? "Red";
      const amount = 10 + Math.round(Math.random() * 6) * 5;
      setBonus((b) => ({ ...b, [team]: (b[team] ?? 0) + amount }));
    }, 2600);
    return () => window.clearInterval(id);
  }, [live]);
  return bonus;
}

export function useCityData() {
  const { data: districts, loading: dLoading } = useDistricts();
  const { data: lb, loading: lLoading } = useLeaderboard();
  const flags = usePreviewFlags();
  const empty = flags.has("empty");
  const bonus = usePreviewBonus(flags.has("live"));

  // Polls hand back fresh objects every 5 s; collapse them to a string so the city only rebuilds on real changes.
  const sig = useMemo(() => JSON.stringify(mergeStats(districts, lb, bonus, empty)), [districts, lb, bonus, empty]);
  const stats = useMemo(() => JSON.parse(sig) as TeamStat[], [sig]);

  return {
    stats,
    loading: (dLoading || lLoading) && !districts && !lb,
    /** at least one endpoint answered */
    online: Boolean(districts || lb),
  };
}

/** "+N" bubbles whenever a team's points go up between polls. */
export function useBursts(stats: TeamStat[]): Burst[] {
  const [prev, setPrev] = useState(stats);
  const [bursts, setBursts] = useState<Burst[]>([]);

  if (prev !== stats) {
    const prevTotal = prev.reduce((s, x) => s + x.points, 0);
    const fresh: Burst[] = [];
    if (prevTotal > 0) {
      for (const s of stats) {
        const before = prev.find((p) => p.team === s.team)?.points ?? 0;
        if (s.points > before) fresh.push({ id: s.points * 10 + TEAM_ROUTE_IDS.indexOf(s.team), team: s.team, amount: s.points - before });
      }
    }
    setPrev(stats);
    if (fresh.length) setBursts((b) => [...b, ...fresh].slice(-8));
  }

  useEffect(() => {
    if (!bursts.length) return;
    const oldest = bursts[0].id;
    const t = window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== oldest)), 1900);
    return () => window.clearTimeout(t);
  }, [bursts]);

  return bursts;
}
