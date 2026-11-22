"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { useRider } from "@/hooks/useRider";
import { USE_MOCKS } from "@/hooks/useMocks";
import { BuildingsLayer, GroundLayer, LabelsLayer, Markers, SCENE_FRAME } from "./CityScene";
import { CityControls, CityHeader, TeamCard, teamFromId } from "./CityOverlay";
import { LeaderboardDock, LeaderboardSheet } from "./Leaderboard3d";
import { buildingItem, freeLandmarkItems, staticItems, type SceneItem } from "./archetypes";
import { buildCity, teamTiers } from "./model";
import { useBursts, useCityData } from "./useCityData";
import { useCamera } from "./useCamera";
import { useIntro, usePrevFloors, useRotation, useTierUps } from "./useCityMotion";
import styles from "./city3d.module.css";

/** Quarter turns pivot on downtown. */
const TURN_ORIGIN = { "--turn-x": `${-SCENE_FRAME.minX}px`, "--turn-y": `${-SCENE_FRAME.minY}px` } as CSSProperties;

/** The City tab: an origami Boston on a kraft table where each line's district folds up taller with its points. */
export function City3D() {
  const { stats, loading, online } = useCityData();
  const { rider } = useRider();
  const mine = rider?.homeTeamRouteId ?? null;

  const buildings = useMemo(() => buildCity(stats), [stats]);
  const prev = usePrevFloors(buildings);
  const tiers = useMemo(() => teamTiers(buildings), [buildings]);
  const tierUps = useTierUps(tiers);
  const bursts = useBursts(stats);
  const intro = useIntro();
  const { rot, phase, rotate } = useRotation();

  // Painter-sorted scene: static trees/bridge + unclaimed landmarks + team buildings (all memoized per item).
  const items = useMemo(() => {
    const claimed = new Set(buildings.filter((b) => b.landmark).map((b) => b.key));
    const list: SceneItem[] = [...staticItems(rot), ...freeLandmarkItems(rot, claimed), ...buildings.map((b) => buildingItem(rot, b))];
    return list.sort((a, b) => b.depth - a.depth);
  }, [buildings, rot]);

  // Tallest roof per team (tags, pennant) and the average roof (camera focus).
  const { anchors, centres } = useMemo(() => {
    const anchors = new Map<TeamRouteId, [number, number]>();
    const sums = new Map<TeamRouteId, [number, number, number]>();
    for (const it of items) {
      if (!it.team || it.kind !== "bld") continue;
      const cur = anchors.get(it.team);
      if (!cur || it.roof[1] < cur[1]) anchors.set(it.team, it.roof);
      const s = sums.get(it.team) ?? [0, 0, 0];
      sums.set(it.team, [s[0] + it.roof[0], s[1] + it.roof[1], s[2] + 1]);
    }
    const centres = new Map<TeamRouteId, [number, number]>();
    for (const [t, s] of sums) centres.set(t, [s[0] / s[2], s[1] / s[2]]);
    return { anchors, centres };
  }, [items]);

  const ranked = useMemo(() => [...stats].sort((a, b) => a.rank - b.rank), [stats]);
  const total = useMemo(() => stats.reduce((s, x) => s + x.points, 0), [stats]);
  const riders = useMemo(() => stats.reduce((s, x) => s + x.riders, 0), [stats]);
  const leader = ranked[0]?.points > 0 ? ranked[0].team : null;

  const [selected, setSelected] = useState<TeamRouteId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const camera = useCamera(stageRef, cameraRef, driftRef, setSelected);

  const focusTeam = useCallback(
    (team: TeamRouteId) => {
      setSelected(team);
      const c = centres.get(team);
      if (!c) return;
      camera.focus(c[0], c[1], Math.max(camera.scale(), 1.1), [0.5, 0.4]);
    },
    [camera, centres],
  );

  const selectedStat = teamFromId(stats, selected);

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <div
        ref={stageRef}
        className={styles.stage}
        data-sel={selected ?? undefined}
        data-intro={intro ? "true" : undefined}
        role="img"
        aria-label="Paper map of Boston. Each MBTA line's district folds up taller as its riders earn points. Drag to pan, pinch to zoom."
      >
        <div ref={cameraRef} className={styles.camera}>
          <div className={styles.turn} data-phase={phase} style={TURN_ORIGIN}>
            <div ref={driftRef} className={styles.drift}>
              <GroundLayer rot={rot} />
              <BuildingsLayer items={items} prev={prev} />
              <LabelsLayer rot={rot} />
              <Markers anchors={anchors} leader={leader} bursts={bursts} tierUps={tierUps} />
            </div>
          </div>
        </div>
      </div>

      <CityHeader total={total} loading={loading} live={USE_MOCKS || online} riders={riders} />
      <CityControls onRotate={() => rotate(1)} onHome={() => camera.home()} />

      {selectedStat ? (
        <TeamCard stat={selectedStat} tier={tiers[selectedStat.team]} leader={ranked[0] ?? null} isMine={mine === selectedStat.team} onClose={() => setSelected(null)} />
      ) : null}

      <LeaderboardDock
        ranked={ranked}
        selected={selected}
        mine={mine}
        onSelect={(t) => (selected === t ? setSelected(null) : focusTeam(t))}
        onExpand={() => setSheetOpen(true)}
      />
      <LeaderboardSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        ranked={ranked}
        tiers={tiers}
        mine={mine}
        onSelect={(t) => {
          setSheetOpen(false);
          focusTeam(t);
        }}
      />
    </div>
  );
}
