"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { Hotspot, Vehicle } from "@/contracts";
import { CloseIcon, StarIcon } from "@/components/icons";
import { Pin } from "@/components/paper/Paper";
import { PaperFlag } from "@/components/paper/origami";
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
// Stable empty list so the memoized vehicle layer doesn't re-render on every poll before data arrives.
const NO_VEHICLES: Vehicle[] = [];
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
  const [goalsVisible, setGoalsVisible] = useState<boolean | undefined>(undefined);
  const goalsOpen = goalsVisible ?? params.get("goals") === "1";
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

  const landmarkGoal = landmarks.find(l => !l.claimed && games.get(l.stopId)?.games.some(g => g.id === `${l.stopId}:landmark:${l.id}`));
  const openGoal = (stopId: string, gameId: string) => {
    setGoalsVisible(false);
    select(stopId);
    setActiveGame(gameId);
  };

  const balance = tokens?.balance ?? null;
  const bannerPx = delay.active ? 64 : 0;

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <TransitMap
        delayedTeams={delayedTeams}
        heat={heat}
        games={games}
        vehicles={vehicleData?.vehicles ?? NO_VEHICLES}
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
        <button type="button" className="paper-btn" onClick={()=>setGoalsVisible(true)} style={{minHeight:48,padding:"0 14px",fontSize:14,fontWeight:700}}><StarIcon size={18} weight={2.2} style={{color:"var(--gold-ink)"}}/>Map goals</button>
      </div>
      {catalogError && <p role="status" className="paper" style={{position:"absolute",left:16,top:"calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 154px)",zIndex:12,padding:"4px 10px",fontSize:12,color:"var(--muted)"}}>Game catalog offline · showing previews</p>}
      {route && <div className="paper paper--stack paper-unfold" style={{position:"absolute",left:16,right:16,bottom:"calc(var(--nav-clearance) + 162px)",padding:"12px 12px 12px 14px",borderRadius:6,display:"flex",gap:12,alignItems:"center",zIndex:10}}><Pin style={{left:14,top:-6,marginLeft:0}}/><span aria-hidden="true" style={{flexShrink:0}}><PaperFlag height={30} tint="#2f6b45"/></span><div style={{flex:1,minWidth:0}}><p style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"var(--accent)"}}>Your alternate route</p><p style={{fontSize:14,marginTop:4}}>{route.reason}</p></div><button type="button" className="paper-btn" aria-label="Clear alternate route" onClick={()=>setRoute(null)} style={{width:44,height:44,padding:0,flexShrink:0}}><CloseIcon size={18}/></button></div>}
      <Sheet open={goalsOpen} onClose={() => setGoalsVisible(false)} title="Map goals">
        <div style={{display:"grid",gap:8,marginBottom:16}}>
          <button type="button" className="paper-btn" onClick={() => openGoal("place-sstat", "place-sstat:trivia")}>
            Play three trivia questions at South Station
          </button>
          {landmarkGoal && <button type="button" className="paper-btn" onClick={() => openGoal(landmarkGoal.stopId, `${landmarkGoal.stopId}:landmark:${landmarkGoal.id}`)}>
            Visit {landmarkGoal.name} · +{landmarkGoal.bonusPoints} points
          </button>}
        </div>
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
