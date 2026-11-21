"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
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
import { placeholderGameMap, withChallenges } from "./placeholderGames";
import { StationSheet } from "./StationSheet";
import { TransitMap } from "./TransitMap";
import { useChallenges } from "./useChallenges";

const NO_TEAMS: TeamRouteId[] = [];
// Header (~64px) + gap; the floating delay banner adds its own space via --banner-space.
const HEADER_SPACE = 88;
// Floating nav + the game strip above it.
const BOTTOM_SPACE = 200;

// Query string without useSearchParams, so the screen still server-renders (no Suspense bailout). Static per page load.
const noop = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

/**
 * Hunt tab: a full-bleed transit map of delays and the mini-games they unlock, with perks folded in.
 * Deep links (handy for demos): ?station=place-kencl opens a station, &game=trivia jumps into a game,
 * ?preview=clear shows the calm no-delay state even while a delay is live.
 */
export function HuntScreen() {
  const search = useSyncExternalStore(noop, readSearch, serverSearch);
  const params = useMemo(() => new URLSearchParams(search), [search]);
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
  const { data: challenges, refresh: refreshChallenges } = useChallenges(riderId, delayedTeams.length > 0);
  const challengeMax = challenges ? Math.max(...challenges.challenges.map((c) => c.points)) : null;
  const games = useMemo(
    () => withChallenges(placeholderGameMap(delayedTeams, landmarks), challengeMax),
    [delayedTeams, landmarks, challengeMax],
  );

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

  // Deep-link values apply until the user picks something (undefined = untouched).
  const linkStation = params.get("station");
  const linkGame = params.get("game");
  const [pickedStation, setSelected] = useState<string | null | undefined>(undefined);
  const [pickedGame, setActiveGame] = useState<string | null | undefined>(undefined);
  const selected = pickedStation !== undefined ? pickedStation : linkStation && STATION_BY_ID.has(linkStation) ? linkStation : null;
  const activeGame = pickedGame !== undefined ? pickedGame : selected && linkGame && pickedStation === undefined ? `${selected}:${linkGame}` : null;
  const [legendOpen, setLegendOpen] = useState(false);

  const select = useCallback((id: string) => {
    setSelected(id);
    setActiveGame(null);
    setLegendOpen(false);
  }, [setSelected, setActiveGame]);
  const close = useCallback(() => {
    setSelected(null);
    setActiveGame(null);
  }, [setSelected, setActiveGame]);
  const earned = useCallback(() => {
    refreshTokens();
    refreshLandmarks();
    refreshChallenges();
  }, [refreshTokens, refreshLandmarks, refreshChallenges]);

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
        challenges={challenges}
        onEarned={earned}
      />
    </div>
  );
}
