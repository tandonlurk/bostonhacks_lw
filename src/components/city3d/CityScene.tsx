"use client";

// The origami city is drawn as stacked layers so each only repaints when its own inputs change:
//   GroundLayer   kraft table, land card, layered water, parks, line ribbons  (per quarter turn only)
//   BuildingsLayer buildings + trees + landmarks, painter-sorted              (per data change; items memoized)
//   LabelsLayer   neighborhood and landmark names                             (per quarter turn only)
//   Markers       HTML paper tags (+N, tier stamps, leader pennant)           (tiny, counter-scaled)
// Selection, zoom-dependent detail and camera moves are pure CSS / DOM writes: no scene re-render.
import { memo, type CSSProperties } from "react";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { landmarkLabels, type SceneItem } from "./archetypes";
import { getCityGeo } from "./geo";
import { groundFor, sceneFrame } from "./iso";
import { TIER_NAMES, type Burst } from "./model";
import { PAPER, TEAM_HEX } from "./palette";
import type { TierUp } from "./useCityMotion";
import styles from "./city3d.module.css";

export type { Burst };

const FRAME = sceneFrame();
export { FRAME as SCENE_FRAME };

const svgProps = {
  width: FRAME.width,
  height: FRAME.height,
  viewBox: `${FRAME.minX} ${FRAME.minY} ${FRAME.width} ${FRAME.height}`,
  className: styles.layer,
  "aria-hidden": true,
} as const;

export const GroundLayer = memo(function GroundLayer({ rot }: { rot: number }) {
  const g = groundFor(rot);
  return (
    <svg {...svgProps}>
      <defs>
        <clipPath id="c3-land">
          <path d={g.land} />
        </clipPath>
      </defs>
      {/* Water: a deeper blue sheet with a lighter sheet laid on top, then folded wave marks. */}
      <g>
        {g.water.map((d, i) => (
          <path key={`d${i}`} d={d} fill={PAPER.waterDeep} transform="translate(2.5 3.5)" />
        ))}
        {g.water.map((d, i) => (
          <path key={`w${i}`} d={d} fill={PAPER.water} stroke={PAPER.waterDeep} strokeWidth="1" strokeLinejoin="round" />
        ))}
        <path d={g.waves} fill="none" stroke={PAPER.waterLine} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </g>
      {/* Land: a sheet of card stock with a cut edge and a soft contact shadow on the table. */}
      <path d={g.shadow} fill={PAPER.landShadow} />
      <path d={g.slab} fill={PAPER.landEdge} />
      <path d={g.land} fill={PAPER.land} />
      <g clipPath="url(#c3-land)">
        <path className={styles.streets} d={g.streets} stroke="rgba(92,66,32,0.07)" strokeWidth="1" fill="none" />
        {g.parks.map((p) => (
          <g key={p.name}>
            <path d={p.edge} fill={PAPER.parkEdge} />
            <path d={p.d} fill={PAPER.park} stroke="rgba(63,112,72,0.35)" strokeWidth="0.6" />
          </g>
        ))}
      </g>
      {/* Lines as paper ribbons: contact shadow, cream cut edge, exact line color. */}
      <g>
        {g.lines.map((l) => (
          <g key={l.team} className={styles.line} data-line={l.team}>
            <path d={l.d} fill="none" stroke="rgba(74,52,22,0.18)" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.8 1.6)" />
            <path d={l.d} fill="none" stroke="#fffaf0" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={l.d} fill="none" stroke={TEAM_HEX[l.team].base} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </g>
    </svg>
  );
});

const Item = memo(function Item({ it, from, delay }: { it: SceneItem; from: number; delay: number }) {
  const cls = it.kind === "bld" ? styles.bld : it.kind === "street-tree" ? styles.streetTree : it.kind === "tree" ? styles.tree : styles.scenery;
  return (
    <g className={cls} data-team={it.team ?? undefined} style={it.kind === "bld" ? ({ "--from": from, "--d": `${delay}ms` } as CSSProperties) : undefined}>
      {it.shapes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.fill ?? "none"}
          stroke={s.stroke}
          strokeWidth={s.w}
          strokeOpacity={s.op}
          strokeDasharray={s.dash}
          strokeLinecap={s.fill ? undefined : "round"}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
});

export const BuildingsLayer = memo(function BuildingsLayer({ items, prev }: { items: SceneItem[]; prev: Map<string, number> }) {
  const R = getCityGeo().radius;
  return (
    <svg {...svgProps}>
      {items.map((it) => {
        if (it.kind !== "bld") return <Item key={it.key} it={it} from={1} delay={0} />;
        const before = prev.get(it.key);
        const from = before && it.floors ? Math.min(1.6, Math.max(0.2, before / it.floors)) : 0.02;
        // Intro ripple from downtown (only applied while the stage has data-intro).
        const delay = Math.round((Math.hypot(it.roof[0], it.roof[1] / 0.62) / (R * 72)) * 700);
        return <Item key={`${it.key}:${it.floors}:${it.team}`} it={it} from={from} delay={delay} />;
      })}
    </svg>
  );
});

export const LabelsLayer = memo(function LabelsLayer({ rot }: { rot: number }) {
  const g = groundFor(rot);
  const lm = landmarkLabels(rot);
  return (
    <svg {...svgProps} className={`${styles.layer} ${styles.labels}`}>
      {g.labels.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle" className={l.water ? styles.waterLabel : undefined}>
          {l.text}
        </text>
      ))}
      {lm.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle" className={styles.lmLabel}>
          {l.text}
        </text>
      ))}
    </svg>
  );
});

const at = (p: [number, number]): CSSProperties => ({ left: p[0] - FRAME.minX, top: p[1] - FRAME.minY });

/** HTML paper tags anchored in scene space. Counter-scaled by useCamera so they stay readable at any zoom. */
export function Markers({
  anchors,
  leader,
  bursts,
  tierUps,
}: {
  anchors: Map<TeamRouteId, [number, number]>;
  leader: TeamRouteId | null;
  bursts: Burst[];
  tierUps: TierUp[];
}) {
  const lead = leader ? anchors.get(leader) : undefined;
  return (
    <div className={styles.markers} data-markers aria-hidden="true">
      {lead && leader ? (
        <div className={styles.marker} style={at(lead)} data-team={leader}>
          <span className={styles.ribbon} style={{ "--team": TEAM_HEX[leader].base } as CSSProperties}>
            No. 1
          </span>
        </div>
      ) : null}
      {tierUps.map((u) => {
        const a = anchors.get(u.team);
        if (!a) return null;
        return (
          <div key={u.id} className={styles.marker} style={at(a)}>
            <span className={styles.tierStamp} style={{ color: TEAM_HEX[u.team].ink }}>
              Tier {u.tier} · {TIER_NAMES[u.tier]}
            </span>
          </div>
        );
      })}
      {bursts.map((b) => {
        const a = anchors.get(b.team);
        if (!a) return null;
        return (
          <div key={b.id} className={styles.marker} style={at(a)}>
            <span className={styles.burstTag} style={{ "--team": TEAM_HEX[b.team].base } as CSSProperties}>
              <span className={styles.burstNum}>+{b.amount}</span>
              <span className={styles.burstTeam}>{TEAMS[b.team].name.replace(" Line", "")}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
