"use client";

// Lightweight live map for the Friends tab: the four T lines plus a marker per friend that glides
// between position updates (CSS transition), so it reads as live tracking.
import { useEffect, useMemo, useState } from "react";
import type { Friend } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { LINES, STATIONS } from "@/components/map/mbta-geo";

const W = 1000;
const PAD = 40;
const SHOWN: TeamRouteId[] = ["Green", "Blue", "Orange", "Red"];

interface Box { x: number; y: number; w: number; h: number }

/** Square frame around points (square to match the card), with room for name labels. */
function fitFrame(pts: { x: number; y: number }[]): Box {
  const pad = 110;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const w0 = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h0 = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const side = Math.max(w0, h0, 420);
  return { x: Math.min(...xs) - pad - (side - w0) / 2, y: Math.min(...ys) - pad - (side - h0) / 2, w: side, h: side };
}

function useProjection() {
  return useMemo(() => {
    const pts = SHOWN.flatMap((t) => LINES[t].flat()).map((id) => STATIONS[id]).filter(Boolean);
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const scale = (W - PAD * 2) / ((maxLng - minLng) * kx);
    const H = (maxLat - minLat) * scale + PAD * 2;
    const project = (lat: number, lng: number) => ({ x: PAD + (lng - minLng) * kx * scale, y: PAD + (maxLat - lat) * scale });
    return { H, project };
  }, []);
}

export function FriendsMap({ friends, selectedId, onSelect }: { friends: Friend[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { H, project } = useProjection();
  // Frame the friends (plus downtown) instead of the whole network so markers stay readable.
  // Sticky: only refit when someone leaves the frame, so the view doesn't jump on every update.
  const [frame, setFrame] = useState<Box | null>(null);
  useEffect(() => {
    const pts = friends.map((f) => project(f.lat, f.lng));
    if (!pts.length) return;
    const inside = (b: Box) => pts.every((p) => p.x > b.x + 30 && p.x < b.x + b.w - 30 && p.y > b.y + 30 && p.y < b.y + b.h - 50);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refit only when a friend leaves the frame
    setFrame((cur) => (cur && inside(cur) ? cur : fitFrame([...pts, project(42.3564, -71.0624)])));
  }, [friends, project]);
  const vb = frame ?? { x: 0, y: 0, w: W, h: H };
  const paths = useMemo(
    () =>
      SHOWN.flatMap((team) =>
        LINES[team].map((branch, i) => ({
          key: `${team}-${i}`,
          color: TEAMS[team].color,
          d: branch
            .map((id) => STATIONS[id])
            .filter(Boolean)
            .map((s, j) => {
              const p = project(s.lat, s.lng);
              return `${j ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" "),
        })),
      ),
    [project],
  );

  return (
    <svg viewBox={`${vb.x.toFixed(0)} ${vb.y.toFixed(0)} ${vb.w.toFixed(0)} ${vb.h.toFixed(0)}`} role="img" aria-label="Map of the T showing where your friends are" style={{ width: "100%", height: "100%", display: "block" }}>
      {paths.map((p) => (
        <path key={p.key} d={p.d} stroke={p.color} strokeWidth={7} strokeOpacity={0.55} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {friends.map((f) => {
        const p = project(f.lat, f.lng);
        const color = TEAMS[f.teamRouteId].color;
        const selected = f.id === selectedId;
        return (
          <g
            key={f.id}
            role="button"
            tabIndex={0}
            aria-label={`${f.name}: ${f.headline}`}
            onClick={() => onSelect(f.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(f.id);
              }
            }}
            style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 4.8s linear", cursor: "pointer" }}
          >
            {f.status === "riding" ? (
              <circle r={26} fill={color} opacity={0.25}>
                <animate attributeName="r" values="22;40;22" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
              </circle>
            ) : null}
            <circle r={selected ? 27 : 22} fill="var(--surface)" stroke={color} strokeWidth={selected ? 6 : 4.5} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={selected ? 18 : 15} fontWeight={800} fill="var(--ink)">
              {f.initials}
            </text>
            <text y={selected ? 46 : 41} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--ink)" stroke="var(--bg)" strokeWidth={5} paintOrder="stroke">
              {f.name.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
