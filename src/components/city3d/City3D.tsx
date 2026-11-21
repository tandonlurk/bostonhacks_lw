"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { useRider } from "@/hooks/useRider";
import { USE_MOCKS } from "@/hooks/useMocks";
import { CityScene } from "./CityScene";
import { CityControls, CityHeader, TeamCard, teamFromId } from "./CityOverlay";
import { LeaderboardDock, LeaderboardSheet } from "./Leaderboard3d";
import { makeIso } from "./iso";
import { FLOOR, buildCity } from "./model";
import { useBursts, useCityData } from "./useCityData";
import { useCamera } from "./useCamera";
import { useAnimatedFloors, useRotation } from "./useCityMotion";
import styles from "./city3d.module.css";

/** The City tab: an isometric night skyline of Boston where each line's district rises with its points. */
export function City3D() {
  const { stats, loading, online } = useCityData();
  const { rider } = useRider();
  const mine = rider?.homeTeamRouteId ?? null;

  const buildings = useMemo(() => buildCity(stats), [stats]);
  const floors = useAnimatedFloors(buildings);
  const bursts = useBursts(stats);
  const { theta, rotate } = useRotation();

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
      const mineB = buildings.filter((b) => b.team === team);
      if (!mineB.length) return;
      // Centre on the team's skyline: average footprint, lifted by its typical height.
      const iso = makeIso(theta);
      let sx = 0;
      let sy = 0;
      for (const b of mineB) {
        const [x, y] = iso.pt(b.x, b.y, (b.floors * FLOOR) / 2);
        sx += x;
        sy += y;
      }
      camera.focus(sx / mineB.length, sy / mineB.length, Math.max(camera.scale(), 1.1), [0.5, 0.36]);
    },
    [buildings, camera, theta],
  );

  const selectedStat = teamFromId(stats, selected);

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <div ref={stageRef} className={styles.stage} role="img" aria-label="3D map of Boston. Each MBTA line's district grows taller as its riders earn points. Drag to pan, pinch to zoom.">
        <div className={styles.stars} />
        <div ref={cameraRef} className={styles.camera}>
          <div ref={driftRef} className={styles.drift}>
            <CityScene theta={theta} buildings={buildings} floors={floors} leader={leader} selected={selected} bursts={bursts} />
          </div>
        </div>
      </div>

      <CityHeader total={total} loading={loading} live={USE_MOCKS || online} riders={riders} />
      <CityControls onRotate={() => rotate(1)} onHome={() => camera.home()} />

      {selectedStat ? (
        <TeamCard stat={selectedStat} leader={ranked[0] ?? null} isMine={mine === selectedStat.team} onClose={() => setSelected(null)} />
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
        mine={mine}
        onSelect={(t) => {
          setSheetOpen(false);
          focusTeam(t);
        }}
      />
    </div>
  );
}
