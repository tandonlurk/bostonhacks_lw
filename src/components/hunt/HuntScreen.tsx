"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { Hotspot } from "@/contracts";
import { SideQuestCard } from "@/components/SideQuestCard";
import { Sheet } from "@/components/ui/Sheet";
import { HotspotPanel } from "./HotspotPanel";
import { useStationGames } from "./useStationGames";
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
  const { data: challenges, sideQuests, refresh: refreshChallenges } = useChallenges(riderId, true);
  const {data: stationCatalog, error: catalogError, refresh: refreshGames} = useStationGames();
  const [hotspots,setHotspots] = useState<Hotspot[]>([]);
  const [route,setRoute] = useState<Hotspot|null>(null);
  const [questsOpen,setQuestsOpen] = useState(false);
  const challengeMax = challenges?.challenges.length ? Math.max(...challenges.challenges.map((c) => c.points)) : null;
  const games = useMemo(
    () => stationCatalog && !forceClear
      ? new Map(stationCatalog.map(s => [s.stopId,{stopId:s.stopId,live:s.delayed,games:s.games}]))
      : withChallenges(placeholderGameMap(delayedTeams, landmarks), challengeMax),
    [stationCatalog, forceClear, delayedTeams, landmarks, challengeMax],
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
    refreshGames();
  }, [refreshTokens, refreshLandmarks, refreshChallenges, refreshGames]);

  const balance = tokens?.balance ?? null;
  const bannerPx = delay.active ? 64 : 0;

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <TransitMap
        delayedTeams={delayedTeams}
        heat={heat}
        games={games}
        vehicles={vehicleData?.vehicles ?? []}
        hotspots={hotspots}
        hotspotRoute={route}
        selectedId={selected ?? route?.stationId ?? null}
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
      <div style={{position:"absolute",left:16,top:"calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 96px)",zIndex:12,display:"flex",gap:8,flexWrap:"wrap",maxWidth:"calc(100% - 80px)"}}>
        <HotspotPanel riderId={riderId} onHotspots={setHotspots} onEarned={earned} onSelect={hotspot=>{setRoute(hotspot);close();}} />
        <button type="button" onClick={()=>setQuestsOpen(true)} style={{minHeight:48,padding:"10px 14px",borderRadius:999,border:"1px solid var(--glass-border)",background:"var(--surface)",fontSize:14,fontWeight:750}}>Daily quest · +25</button>
      </div>
      {catalogError && <p role="status" style={{position:"absolute",left:16,top:"calc(var(--banner-space) + 154px)",fontSize:12,color:"var(--muted)"}}>Game catalog offline · showing previews</p>}
      {route && <div className="glass" style={{position:"absolute",left:16,right:16,bottom:"calc(var(--nav-clearance) + 162px)",padding:"12px 14px",borderRadius:18,display:"flex",gap:12,alignItems:"center",zIndex:10}}><div style={{flex:1,minWidth:0}}><p style={{fontSize:14,fontWeight:750,color:"var(--accent)"}}>Your alternate route</p><p style={{fontSize:14,marginTop:4}}>{route.reason}</p></div><button type="button" aria-label="Clear alternate route" onClick={()=>setRoute(null)} style={{minWidth:44,minHeight:44,border:0,borderRadius:99,background:"var(--surface-2)",fontSize:24}}>×</button></div>}
      <Sheet open={questsOpen} onClose={()=>setQuestsOpen(false)} title="A little extra for your team">
        {sideQuests.length ? sideQuests.map(quest=><SideQuestCard key={quest.id} quest={quest} homeTeam={rider?.homeTeamRouteId}/>) : <p style={{fontSize:16,lineHeight:1.6}}>Ride the Silver Line for three verified minutes in one ride to earn +25 points for your home team. Progress appears here when the quest service is available.</p>}
      </Sheet>
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
