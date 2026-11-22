"use client";

import type { ReactNode } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import s from "./onboarding.module.css";

// Flat editorial illustration: bold charcoal outlines, flat fills, everyday commuters.
const OUT = "#26232e";
const SW = 2.4;
const PHONE = "#7da2f5";
const PANTS = "#3c4157";
export const SOFT_LINE: Record<TeamRouteId, string> = { Red: "#e5483c", Orange: "#f2972e", Blue: "#3b73d1", Green: "#3f9a55", Silver: "#8e98a0" };

/** A limb drawn as a thick rounded stroke with an outline underneath. */
function Limb({ d, color, w = 8.5 }: { d: string; color: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={OUT} strokeWidth={w + SW * 2} />
      <path d={d} stroke={color} strokeWidth={w} />
    </g>
  );
}

type Pose = "walkPhone" | "phoneUp" | "walkCoffee";
type Hair = "ponytail" | "short" | "bun";

const HAIR: Record<Hair, (color: string, accent: string) => ReactNode> = {
  short: (c) => <path d="M-11 -122.5 C-12.5 -135.5 -3 -142 5 -141 C12.5 -140 16.5 -134.5 14.4 -128 C10 -131.5 4.5 -131.8 0.5 -129.5 C-1.5 -126.5 -3.5 -123.5 -5.2 -119 C-7.4 -118.6 -9.4 -119.6 -11 -122.5Z" fill={c} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />,
  ponytail: (c, accent) => (
    <>
      <path d="M-10.5 -129.5 C-19 -130 -23 -121 -20.5 -109 C-17.5 -113 -14 -117 -10 -120.5Z" fill={c} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-11 -121 C-12.5 -135.5 -2.5 -142.5 6 -141.5 C13.5 -140.5 16.5 -134 14.6 -127.5 C9.6 -131.4 3.4 -132.4 -1.6 -130.6 C-3.6 -127.4 -5.6 -124.4 -7.4 -119.6Z" fill={c} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx="-11" cy="-127.5" r="2.4" fill={accent} stroke={OUT} strokeWidth="1.6" />
    </>
  ),
  bun: (c) => (
    <>
      <circle cx="-4" cy="-141" r="6.5" fill={c} stroke={OUT} strokeWidth={SW} />
      <path d="M-11 -122 C-12.5 -135.5 -3 -142 5 -141 C12.5 -140 16.5 -134.5 14.4 -128 C10 -131.5 4.5 -131.8 0.5 -129.5 C-1.5 -126.5 -3.5 -123.5 -5.2 -119 C-7.4 -118.6 -9.4 -119.6 -11 -122Z" fill={c} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
    </>
  ),
};

function Person({ x, y, scale = 1, pose, skin, hair, hairColor, top, accent = "#f2c94c" }: { x: number; y: number; scale?: number; pose: Pose; skin: string; hair: Hair; hairColor: string; top: string; accent?: string }) {
  const walking = pose !== "phoneUp";
  const tilt = pose === "walkPhone" ? 11 : pose === "phoneUp" ? -3 : 0;
  const lookingDown = pose === "walkPhone";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="28" ry="4" fill={OUT} opacity=".12" />
      <g className={walking ? s.stride : s.idle}>
        {/* legs + shoes */}
        {walking ? <>
          <Limb d="M-4 -58 L-9 -33 L-15 -10" color={PANTS} w={11.5} />
          <Limb d="M5 -58 L10 -33 L15 -10" color={PANTS} w={11.5} />
          <rect x="-25" y="-12" width="17" height="9" rx="4" fill="#fff" stroke={OUT} strokeWidth={SW} transform="rotate(-10 -16 -8)" />
          <rect x="8" y="-12" width="18" height="9" rx="4" fill="#fff" stroke={OUT} strokeWidth={SW} transform="rotate(6 17 -8)" />
        </> : <>
          <Limb d="M-5 -58 L-6 -10" color={PANTS} w={11.5} />
          <Limb d="M5 -58 L6 -10" color={PANTS} w={11.5} />
          <rect x="-15" y="-11" width="16" height="9" rx="4" fill="#fff" stroke={OUT} strokeWidth={SW} />
          <rect x="2" y="-11" width="17" height="9" rx="4" fill="#fff" stroke={OUT} strokeWidth={SW} />
        </>}
        {/* back arm (+ tote bag for the coffee walker) */}
        {pose === "walkCoffee" && <rect x="-27" y="-80" width="16" height="19" rx="3" fill="#efe3cf" stroke={OUT} strokeWidth={SW} />}
        {pose === "walkPhone" && <Limb d="M-10 -99 L-12 -79 L-3 -75" color={top} />}
        {pose === "phoneUp" && <><Limb d="M-10 -99 L-13 -79 L-11 -63" color={top} /><circle cx="-11" cy="-61" r="4" fill={skin} stroke={OUT} strokeWidth="2" /></>}
        {pose === "walkCoffee" && <><Limb d="M-10 -99 L-17 -81 L-16 -66" color={top} /><circle cx="-16" cy="-64" r="4" fill={skin} stroke={OUT} strokeWidth="2" /></>}
        {/* neck, sweater */}
        <rect x="-4" y="-115" width="8" height="10" rx="2" fill={skin} stroke={OUT} strokeWidth="2" />
        <path d="M-15 -100 C-16 -106 -9 -109 0 -109 C9 -109 16 -106 15 -100 L14 -56 C6 -52 -6 -52 -14 -56Z" fill={top} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M-14 -61 C-6 -57 6 -57 14 -61" stroke={OUT} strokeWidth="1.4" opacity=".45" fill="none" />
        <path d="M-6 -108 Q0 -104 6 -108" stroke={OUT} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {pose === "walkCoffee" && <path d="M-8 -106 L-19 -80" stroke={OUT} strokeWidth="2.2" strokeLinecap="round" />}
        {/* head */}
        <g transform={`rotate(${tilt} 0 -112)`}>
          <path d="M-9.5 -124 C-9.5 -134.5 -2.5 -139.5 4 -139 C10.5 -138.5 14 -133 13.2 -126.5 L16.8 -121.5 L13.2 -120 C12.6 -114.5 8.6 -110.5 2.6 -110.5 C-4.2 -110.5 -9.5 -115.5 -9.5 -124Z" fill={skin} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
          {HAIR[hair](hairColor, accent)}
          <path d="M1 -137.5 q5 -1.5 9 1" stroke="#fff" strokeWidth="1.6" opacity=".35" fill="none" strokeLinecap="round" />
          <ellipse cx="-1.5" cy="-123" rx="2.6" ry="3.6" fill={skin} stroke={OUT} strokeWidth="1.8" />
          {lookingDown ? <path d="M7 -125 q2 1.4 4 0" stroke={OUT} strokeWidth="1.8" fill="none" strokeLinecap="round" /> : <circle cx="9" cy="-125.5" r="1.5" fill={OUT} />}
          <path d="M6.5 -129.8 q2.6 -1.4 5.2 -.2" stroke={OUT} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M10.2 -114.8 q1.6 .7 3 -.2" stroke={OUT} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
        {/* front arm + props */}
        {pose === "walkPhone" && <>
          <Limb d="M9 -100 L12 -80 L19 -90" color={top} />
          <g transform="rotate(-15 21 -96)">
            <rect x="16.5" y="-104" width="9" height="15" rx="2.2" fill={PHONE} stroke={OUT} strokeWidth="2" />
            <path d="M18.6 -99.5 h4.8 M18.6 -96.5 h4.8 M18.6 -93.5 h4.8" stroke="#dbe7ff" strokeWidth="1.3" strokeLinecap="round" />
          </g>
          <circle cx="20" cy="-91" r="4" fill={skin} stroke={OUT} strokeWidth="2" />
        </>}
        {pose === "phoneUp" && <>
          <Limb d="M9 -100 L19 -86 L21 -108" color={top} />
          <rect x="16" y="-126" width="10" height="16" rx="2.4" fill={PHONE} stroke={OUT} strokeWidth="2" />
          <circle cx="21" cy="-110" r="4" fill={skin} stroke={OUT} strokeWidth="2" />
        </>}
        {pose === "walkCoffee" && <>
          <Limb d="M9 -100 L15 -81 L24 -86" color={top} />
          <path d="M21 -100 h11 l-1.5 15 h-8z" fill="#fffaf2" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
          <path d="M21.7 -95 h9.6 l-.5 5 h-8.6z" fill="#c89f72" />
          <rect x="20" y="-103.5" width="13" height="4" rx="1.6" fill="#fff" stroke={OUT} strokeWidth="2" />
          <circle cx="24.5" cy="-87" r="4" fill={skin} stroke={OUT} strokeWidth="2" />
        </>}
      </g>
    </g>
  );
}

/** A transit line with station dots, like a route map strip. */
function Route({ d, color, dots }: { d: string; color: string; dots: [number, number][] }) {
  return (
    <g>
      <path d={d} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill={OUT} />)}
    </g>
  );
}

function Tiles({ height = 150 }: { height?: number }) {
  const rows = Math.ceil(height / 22);
  return (
    <g stroke="#dde6ec" strokeWidth="1.4">
      {Array.from({ length: rows }, (_, r) => <path key={`h${r}`} d={`M0 ${r * 22} H320`} />)}
      {Array.from({ length: rows }, (_, r) => Array.from({ length: 9 }, (_, c) => <path key={`v${r}-${c}`} d={`M${c * 44 + (r % 2 ? 22 : 0)} ${r * 22} V${r * 22 + 22}`} />))}
    </g>
  );
}

/** Step 1: your line. A commuter checks their phone on the way to a train in their line's color. */
function LineScene({ team }: { team: TeamRouteId | null }) {
  const color = team ? SOFT_LINE[team] : "#8fbfe0";
  const label = team ? `${team} line` : "Find your line";
  return (
    <svg viewBox="0 0 320 200" width="100%" aria-hidden="true" focusable="false" className={s.ticketSvg}>
      <rect width="320" height="200" fill="#f1f5f8" />
      <Tiles />
      <Route d="M-10 14 C 30 14 50 4 90 4 H330" color={color} dots={[[112, 4], [140, 4], [168, 4], [196, 4], [224, 4], [252, 4], [280, 4], [308, 4]]} />
      <g>
        <rect x="16" y="24" width={label.length * 9.2 + 58} height="30" rx="6" fill="#1f1f27" />
        <circle cx="33" cy="39" r="9.5" fill="#fff" />
        <text x="33" y="43.6" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1f1f27" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>T</text>
        <path d="M50 30 V48" stroke="#5b5b66" strokeWidth="1.5" />
        <text x="58" y="43.6" fontSize="12.5" fontWeight="800" letterSpacing="1.6" fill="#f2c94c" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", textTransform: "uppercase" }}>{label.toUpperCase()}</text>
      </g>
      <rect x="0" y="150" width="320" height="50" fill="#e3e9ee" />
      <rect x="0" y="150" width="320" height="6" fill="#f2c94c" />
      <g className={s.trainIn}>
        <rect x="200" y="58" width="150" height="96" rx="18" fill={color} stroke={OUT} strokeWidth={SW} />
        <rect x="212" y="70" width="140" height="32" rx="8" fill="#2d3a4f" stroke={OUT} strokeWidth="2" />
        <path d="M222 96 L240 74 M236 96 L254 74" stroke="#fff" strokeWidth="3" opacity=".18" />
        <rect x="262" y="66" width="38" height="86" rx="5" fill="#3b475a" stroke={OUT} strokeWidth="2" />
        <path d="M281 66 V152" stroke={OUT} strokeWidth="2" opacity=".5" />
        <rect x="200" y="118" width="62" height="7" fill="#fff" opacity=".85" />
        <circle cx="212" cy="138" r="5" fill="#fff3c4" stroke={OUT} strokeWidth="2" />
      </g>
      <Person x={148} y={184} scale={0.86} pose="walkPhone" skin="#e8b48f" hair="ponytail" hairColor="#7a4a2a" top="#ec7bb8" />
    </svg>
  );
}

/** Step 2: you are here. A rider holds up their phone and their spot drops in on the map. */
function HereScene() {
  return (
    <svg viewBox="0 0 320 200" width="100%" aria-hidden="true" focusable="false" className={s.ticketSvg}>
      <rect width="320" height="200" fill="#eaf4fa" />
      <g stroke="#fff" strokeWidth="7" opacity=".9">
        <path d="M-10 60 L330 40" /><path d="M-10 132 L330 112" /><path d="M70 -10 L90 210" /><path d="M210 -10 L236 210" />
      </g>
      <Route d="M-10 92 C 60 92 80 70 140 70 H 330" color="#ec7bb8" dots={[[160, 70], [188, 70], [216, 70], [244, 70], [272, 70], [300, 70]]} />
      <Route d="M-10 30 C 40 30 64 46 110 46 C 170 46 190 24 240 24 H330" color="#7f9cf5" dots={[[20, 32], [60, 42], [110, 46], [160, 40], [254, 24], [292, 24]]} />
      <Route d="M330 160 C 280 160 262 176 220 176 H 160" color="#f2c94c" dots={[[300, 160], [252, 170], [196, 176]]} />
      <g className={s.ping}>
        <ellipse cx="172" cy="66" rx="20" ry="7" fill="none" stroke="#12344a" strokeWidth="2" opacity=".35" />
        <ellipse cx="172" cy="66" rx="34" ry="12" fill="none" stroke="#12344a" strokeWidth="2" opacity=".18" />
      </g>
      <g className={s.pin}>
        <path d="M172 66 C172 66 156 49 156 38 A16 16 0 1 1 188 38 C188 49 172 66 172 66Z" fill="#e5483c" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
        <circle cx="172" cy="38" r="6" fill="#fff" stroke={OUT} strokeWidth="2" />
      </g>
      <Person x={120} y={194} pose="phoneUp" skin="#9a5b3c" hair="short" hairColor="#2b211d" top="#7f97f0" />
    </svg>
  );
}

/** Step 3: the scenic route. Coffee in hand, taking the long way past the park. */
function ScenicScene() {
  return (
    <svg viewBox="0 0 320 200" width="100%" aria-hidden="true" focusable="false" className={s.ticketSvg}>
      <rect width="320" height="200" fill="#e3f1f9" />
      <g fill="#cfe3f0" stroke="#b9d3e6" strokeWidth="1.5">
        <rect x="10" y="74" width="40" height="80" rx="3" /><rect x="56" y="92" width="34" height="62" rx="3" />
        <rect x="236" y="62" width="44" height="92" rx="3" /><rect x="284" y="86" width="34" height="68" rx="3" />
      </g>
      <g fill="#fff" opacity=".8">
        {[[18, 84], [32, 84], [18, 100], [32, 100], [18, 116], [32, 116], [64, 102], [76, 102], [64, 118], [76, 118], [246, 74], [262, 74], [246, 92], [262, 92], [246, 110], [262, 110], [292, 96], [304, 96], [292, 112], [304, 112]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="9" rx="1.5" />)}
      </g>
      <Route d="M330 22 C 280 22 262 40 214 40 H -10" color="#f2c94c" dots={[[300, 22], [252, 36], [200, 40], [160, 40], [120, 40], [80, 40], [40, 40]]} />
      {[[112, 150, 22], [200, 150, 26], [292, 156, 18]].map(([x, y, r]) => (
        <g key={x}>
          <rect x={x - 3} y={y - 8} width="6" height="12" rx="2" fill="#8a6a4f" stroke={OUT} strokeWidth="2" />
          <circle cx={x} cy={y - r} r={r} fill="#a8d08d" stroke={OUT} strokeWidth={SW} />
          <path d={`M${x - r * 0.5} ${y - r * 0.6} q${r * 0.3} -${r * 0.35} ${r * 0.7} -${r * 0.2}`} stroke="#fff" strokeWidth="2" opacity=".4" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <rect x="0" y="154" width="320" height="46" fill="#eef0ee" />
      <path d="M0 154 H320" stroke="#c9d2d8" strokeWidth="2" />
      <path d="M0 176 H320" stroke="#dfe3e1" strokeWidth="2" strokeDasharray="22 14" />
      <Person x={150} y={190} pose="walkCoffee" skin="#c98a5f" hair="bun" hairColor="#2f211b" top="#f0c84a" />
    </svg>
  );
}

export function TicketArt({ step, team }: { step: number; team: TeamRouteId | null }) {
  if (step === 0) return <LineScene team={team} />;
  if (step === 1) return <HereScene />;
  return <ScenicScene />;
}
