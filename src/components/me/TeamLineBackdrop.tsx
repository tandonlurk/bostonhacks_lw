import { useMemo } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { linePaths, makeProjector, stationsFor } from "@/components/map/projection";
import { lineVar } from "./team";

/** The rider's real line as a faint papercut strip behind the passport page (decorative). */
export function TeamLineBackdrop({ team }: { team: TeamRouteId }) {
  const { paths, dots, w, h } = useMemo(() => {
    const st = stationsFor(team);
    const lats = st.map((x) => x.lat);
    const lngs = st.map((x) => x.lng);
    const padLat = (Math.max(...lats) - Math.min(...lats)) * 0.12 + 0.004;
    const padLng = (Math.max(...lngs) - Math.min(...lngs)) * 0.12 + 0.004;
    const p = makeProjector(
      { minLat: Math.min(...lats) - padLat, maxLat: Math.max(...lats) + padLat, minLng: Math.min(...lngs) - padLng, maxLng: Math.max(...lngs) + padLng },
      600,
    );
    return {
      paths: linePaths(p, team),
      dots: st.map((x) => ({ id: x.id, ...p.project(x.lat, x.lng) })),
      w: p.width,
      h: p.height,
    };
  }, [team]);

  const fill = lineVar(team);
  const sw = Math.max(w, h) / 70;
  const off = sw * 0.45;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.2,
        WebkitMaskImage: "radial-gradient(120% 90% at 60% 40%, #000 30%, transparent 80%)",
        maskImage: "radial-gradient(120% 90% at 60% 40%, #000 30%, transparent 80%)",
        pointerEvents: "none",
      }}
    >
      {/* Papercut: a shadow strip under the cut line, then the line itself, then punched station holes. */}
      <g fill="none" stroke="#4a3416" strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${off} ${off})`}>
        {paths.map((d, i) => (
          <path key={i} d={d} strokeWidth={sw} />
        ))}
      </g>
      <g fill="none" stroke={fill} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => (
          <path key={i} d={d} strokeWidth={sw} />
        ))}
      </g>
      <g fill="var(--cream)" stroke="#4a3416" strokeOpacity={0.4} strokeWidth={sw / 6}>
        {dots.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r={sw * 0.32} />
        ))}
      </g>
    </svg>
  );
}
