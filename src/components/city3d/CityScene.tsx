"use client";

import { memo, useMemo } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { buildingGeometry, groundGeometry, makeIso, sceneFrame, type BuildingGeometry } from "./iso";
import type { Building } from "./model";
import { TEAM_HEX } from "./palette";
import styles from "./city3d.module.css";

export interface Burst {
  id: number;
  team: TeamRouteId;
  amount: number;
}

interface Props {
  theta: number;
  buildings: Building[];
  /** current (animated) floors per building key */
  floors: Map<string, number>;
  leader: TeamRouteId | null;
  selected: TeamRouteId | null;
  bursts: Burst[];
}

const FRAME = sceneFrame();

export const CityScene = memo(function CityScene({ theta, buildings, floors, leader, selected, bursts }: Props) {
  const iso = useMemo(() => makeIso(theta), [theta]);
  const ground = useMemo(() => groundGeometry(iso), [iso]);

  const geoms = useMemo(() => {
    const list: { g: BuildingGeometry; depth: number }[] = [];
    for (const b of buildings) {
      const fl = floors.get(b.key) ?? 0;
      if (fl <= 0.02) continue;
      list.push({ g: buildingGeometry(iso, b, fl), depth: iso.depth(b.x, b.y) });
    }
    // Painter's algorithm: far (higher on screen) first.
    list.sort((a, b) => b.depth - a.depth);
    return list.map((l) => l.g);
  }, [iso, buildings, floors]);

  const anchors = useMemo(() => {
    const best = new Map<TeamRouteId, BuildingGeometry>();
    for (const g of geoms) {
      const cur = best.get(g.team);
      if (!cur || g.height > cur.height) best.set(g.team, g);
    }
    return best;
  }, [geoms]);

  const beacon = leader ? anchors.get(leader) : undefined;

  const leaderRoofs = useMemo(
    () => (leader ? geoms.filter((g) => g.team === leader).sort((a, b) => b.height - a.height).slice(0, 14) : []),
    [geoms, leader],
  );

  return (
    <svg
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`${FRAME.minX} ${FRAME.minY} ${FRAME.width} ${FRAME.height}`}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="c3-roof" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c3-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b1a2e" />
          <stop offset="100%" stopColor="#081221" />
        </linearGradient>
        <linearGradient id="c3-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="c3-land">
          <path d={ground.land} />
        </clipPath>
        <filter id="c3-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* Ground: harbor + rivers sit just below the land slab */}
      <g>
        {ground.water.map((d, i) => (
          <path key={i} d={d} fill="url(#c3-water)" stroke="#3d7bff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinejoin="round" />
        ))}
        <path d={ground.slab} fill="#06080c" />
        <path d={ground.land} fill="#141a24" />
        <path d={ground.streets} clipPath="url(#c3-land)" stroke="#ffffff" strokeOpacity="0.045" strokeWidth="1" fill="none" />
      </g>

      {/* Lines as glowing ground strokes */}
      <g opacity={selected ? 0.55 : 1}>
        <g filter="url(#c3-blur)" opacity="0.55">
          {ground.lines.map((l) => (
            <path key={l.team} d={l.d} fill="none" stroke={TEAM_HEX[l.team].glow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
        {ground.lines.map((l) => (
          <path
            key={l.team}
            d={l.d}
            fill="none"
            stroke={TEAM_HEX[l.team].glow}
            strokeWidth={selected === l.team ? 2.6 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={selected && selected !== l.team ? 0.35 : 0.95}
          />
        ))}
      </g>


      {/* Buildings, back to front */}
      <g>
        {geoms.map((g) => {
          const dim = selected !== null && selected !== g.team;
          const hot = selected === g.team;
          return (
            <g key={g.key} data-team={g.team} opacity={dim ? 0.22 : 1} style={{ cursor: "pointer" }}>
              {g.faces.map((face, i) => (
                <polygon key={i} points={face.points} fill={face.fill} />
              ))}
              {g.windows ? (
                <path
                  d={g.windows}
                  stroke={g.team === leader || hot ? "#fff1b8" : "#ffd98a"}
                  strokeOpacity={g.team === leader || hot ? 0.85 : 0.5}
                  strokeWidth="2.3"
                  strokeDasharray={g.dash}
                  fill="none"
                />
              ) : null}
              <polygon
                points={g.top}
                fill={hot || g.team === leader ? TEAM_HEX[g.team].glow : TEAM_HEX[g.team].base}
                stroke={hot ? "#ffffff" : TEAM_HEX[g.team].glow}
                strokeOpacity={hot ? 0.9 : 0.5}
                strokeWidth={hot ? 1.2 : 0.8}
              />
            </g>
          );
        })}
      </g>

      {/* Neighborhood names float above the skyline so the map always reads as Boston */}
      <g className={styles.labels}>
        {ground.labels.map((l) => (
          <text key={l.text} x={l.x} y={l.y} textAnchor="middle">
            {l.text}
          </text>
        ))}
      </g>

      {/* Rooftop bloom for the leading team */}
      {leader ? (
        <g style={{ mixBlendMode: "screen", pointerEvents: "none" }} opacity={selected && selected !== leader ? 0.2 : 1}>
          {leaderRoofs.map((g) => (
            <ellipse key={g.key} cx={g.roof[0]} cy={g.roof[1]} rx="22" ry="13" fill="url(#c3-roof)" className={styles.roofGlow} />
          ))}
        </g>
      ) : null}

      {/* Searchlight on the leader's tallest tower */}
      {beacon ? (
        <g style={{ pointerEvents: "none" }} opacity={selected && selected !== leader ? 0.2 : 1}>
          <rect className={styles.beacon} x={beacon.roof[0] - 1.5} y={beacon.roof[1] - 120} width="3" height="118" fill="url(#c3-beam)" />
          <circle cx={beacon.roof[0]} cy={beacon.roof[1] - 3} r="3.2" fill={TEAM_HEX[beacon.team].glow} />
        </g>
      ) : null}

      {/* Floating +N when a team scores between polls */}
      <g style={{ pointerEvents: "none" }}>
        {bursts.map((b) => {
          const a = anchors.get(b.team);
          if (!a) return null;
          return (
            <text
              key={b.id}
              x={a.roof[0]}
              y={a.roof[1] - 10}
              textAnchor="middle"
              className={styles.burst}
              fill={TEAM_HEX[b.team].glow}
            >
              +{b.amount}
            </text>
          );
        })}
      </g>
    </svg>
  );
});

export { FRAME as SCENE_FRAME };
