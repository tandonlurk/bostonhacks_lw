"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TeamRouteId } from "@/contracts/routes";
import { useDelay } from "@/hooks/useDelay";
import { useHeatmap } from "@/hooks/useHeatmap";
import { useLandmarks } from "@/hooks/useLandmarks";
import { usePerks } from "@/hooks/usePerks";
import { useRider } from "@/hooks/useRider";
import { useTokens } from "@/hooks/useTokens";
import { useVehicles } from "@/hooks/useVehicles";
import { GameStrip } from "./GameStrip";
import { HuntHeader } from "./HuntHeader";
import { Legend } from "./Legend";
import { STATION_BY_ID } from "./mapModel";
import { placeholderGameMap } from "./placeholderGames";
import { StationSheet } from "./StationSheet";
import { TransitMap } from "./TransitMap";

const NO_TEAMS: TeamRouteId[] = [];
// Header (~64px) + gap; the floating delay banner adds its own space via --banner-space.
const HEADER_SPACE = 88;
// Floating nav + the game strip above it.
const BOTTOM_SPACE = 200;

/**
 * Hunt tab: a full-bleed transit map of delays and the mini-games they unlock, with perks folded in.
 * Deep links (handy for demos): ?station=place-kencl opens a station, &game=trivia jumps into a game,
 * ?preview=clear shows the calm no-delay state even while a delay is live.
 */
export function HuntScreen() {
  const params = useSearchParams();
  const forceClear = params.get("preview") === "clear";

  const { rider } = useRider();
  const riderId = rider?.riderId ?? null;
  const delay = useDelay();
  const { data: heatData } = useHeatmap(true);
  const { data: vehicleData } = useVehicles();
  const { data: landmarks, refresh: refreshLandmarks } = useLandmarks(riderId);
  const { data: tokens, refresh: refreshTokens } = useTokens(riderId);
  const { data: perks } = usePerks();

  const delayKey = delay.active && !forceClear ? delay.teamRouteIds.join(",") : "";
  const delayedTeams = useMemo(() => (delayKey ? (delayKey.split(",") as TeamRouteId[]) : NO_TEAMS), [delayKey]);
  const games = useMemo(() => placeholderGameMap(delayedTeams, landmarks), [delayedTeams, landmarks]);

  const heat = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of heatData?.stations ?? []) m.set(s.stopId, Math.max(m.get(s.stopId) ?? 0, s.slowShare));
    return m;
  }, [heatData]);

  const stripStations = useMemo(() => {
    const list = [...games.values()];
    const rank = (id: string) => {
      const s = STATION_BY_ID.get(id);
      return (s?.importance ?? 0) + (heat.get(id) ?? 0) * 4;
    };
    return list.sort((a, b) => Number(b.live) - Number(a.live) || rank(b.stopId) - rank(a.stopId)).slice(0, 14);
  }, [games, heat]);
  const liveCount = useMemo(() => [...games.values()].filter((g) => g.live).length, [games]);

  const initialStation = params.get("station");
  const [selected, setSelected] = useState<string | null>(initialStation && STATION_BY_ID.has(initialStation) ? initialStation : null);
  const [activeGame, setActiveGame] = useState<string | null>(() => {
    const kind = params.get("game");
    return initialStation && kind ? `${initialStation}:${kind}` : null;
  });
  const [legendOpen, setLegendOpen] = useState(false);

  const select = useCallback((id: string) => {
    setSelected(id);
    setActiveGame(null);
    setLegendOpen(false);
  }, []);
  const close = useCallback(() => {
    setSelected(null);
    setActiveGame(null);
  }, []);
  const earned = useCallback(() => {
    refreshTokens();
    refreshLandmarks();
  }, [refreshTokens, refreshLandmarks]);

  const balance = tokens?.balance ?? null;
  const bannerPx = delay.active ? 64 : 0;

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <TransitMap
        delayedTeams={delayedTeams}
        heat={heat}
        games={games}
        vehicles={vehicleData?.vehicles ?? []}
        selectedId={selected}
        onSelect={select}
        insetTop={HEADER_SPACE + bannerPx}
        insetBottom={BOTTOM_SPACE}
      />

      <HuntHeader
        delayedTeams={delayedTeams}
        liveStations={liveCount}
        balance={balance}
        legendOpen={legendOpen}
        onToggleLegend={() => setLegendOpen((o) => !o)}
      />
      {legendOpen ? <Legend heatAvailable={!!heatData?.available} /> : null}

      <GameStrip live={delayedTeams.length > 0} stations={stripStations} heat={heat} onPick={select} />

      <StationSheet
        stopId={selected}
        games={selected ? games.get(selected) : undefined}
        activeGameId={activeGame}
        onPlay={setActiveGame}
        onClose={close}
        delayedTeams={delayedTeams}
        delayMessage={delay.message}
        slowShare={selected ? heat.get(selected) : undefined}
        riderId={riderId}
        balance={balance}
        perks={perks}
        landmarks={landmarks}
        onEarned={earned}
      />
    </div>
  );
}
