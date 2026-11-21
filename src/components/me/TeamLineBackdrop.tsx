import { useMemo } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { linePaths, makeProjector, stationsFor } from "@/components/map/projection";
import { glowVar } from "./team";

/** The rider's real line, drawn faintly behind the profile hero like a cover photo. */
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

  const glow = glowVar(team);
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
        opacity: 0.24,
        WebkitMaskImage: "radial-gradient(120% 90% at 50% 35%, #000 30%, transparent 78%)",
        maskImage: "radial-gradient(120% 90% at 50% 35%, #000 30%, transparent 78%)",
        pointerEvents: "none",
      }}
    >
      <g fill="none" stroke={glow} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => (
          <path key={i} d={d} strokeWidth={Math.max(w, h) / 90} />
        ))}
      </g>
      <g fill="var(--bg)" stroke={glow} strokeWidth={Math.max(w, h) / 260}>
        {dots.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r={Math.max(w, h) / 150} />
        ))}
      </g>
    </svg>
  );
}
