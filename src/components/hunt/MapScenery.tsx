// Papercut Boston under the Hunt map: kraft table, a cream land sheet with a soft drop shadow onto blue harbor paper,
// the Charles and Mystic as recessed blue channels, green park cut-outs, and origami landmarks + neighborhood names.
// Everything is decorative (aria-hidden), drawn in world units (so it zooms with the map) and memoized with no
// props, so React never re-renders it after mount. Shapes are hand-simplified, not survey-accurate: scenery is
// never a factual claim (docs/design.md section 1.3).
import { memo } from "react";
import {
  BackBayTowers,
  Brownstone,
  Citgo,
  CustomHouse,
  Fenway,
  GreatDome,
  OldNorth,
  PaperCloud,
  PaperElm,
  PaperTree,
  PaperWaves,
  SeaportCrane,
  StateHouse,
  SwanBoat,
  TripleDecker,
  Zakim,
  type OrigamiProps,
} from "@/components/paper/origami";
import { WORLD, projectLatLng } from "./mapModel";
import css from "./map.module.css";

type LL = [lat: number, lng: number];

function pts(list: LL[]) {
  return list.map(([lat, lng]) => projectLatLng(lat, lng));
}

function pathOf(list: LL[], close = false) {
  const d = pts(list)
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join("");
  return close ? `${d}Z` : d;
}

/* ---------------------------------------------------------------------- */
/* Geography (simplified)                                                  */
/* ---------------------------------------------------------------------- */

/** Harbor coastline, north to south; land is everything west of it. */
const COAST: LL[] = [
  [42.46, -70.978],
  [42.425, -70.982],
  [42.405, -70.984],
  [42.392, -70.983],
  [42.385, -70.99],
  [42.375, -70.99],
  [42.36, -70.99],
  [42.352, -71.005],
  [42.357, -71.02],
  [42.362, -71.032],
  [42.366, -71.042],
  [42.372, -71.042],
  [42.38, -71.035],
  [42.386, -71.03],
  [42.389, -71.035],
  [42.388, -71.042],
  [42.384, -71.048],
  [42.388, -71.06],
  [42.392, -71.068],
  [42.396, -71.075],
  [42.392, -71.078],
  [42.386, -71.068],
  [42.38, -71.058],
  [42.375, -71.052],
  [42.371, -71.055],
  [42.369, -71.058],
  [42.366, -71.052],
  [42.362, -71.049],
  [42.358, -71.0505],
  [42.356, -71.0515],
  [42.35, -71.0535],
  [42.3455, -71.0562],
  [42.3448, -71.0566],
  [42.3452, -71.0546],
  [42.349, -71.0515],
  [42.3545, -71.049],
  [42.3555, -71.044],
  [42.353, -71.036],
  [42.35, -71.028],
  [42.347, -71.022],
  [42.341, -71.015],
  [42.336, -71.013],
  [42.332, -71.022],
  [42.328, -71.035],
  [42.322, -71.045],
  [42.318, -71.04],
  [42.312, -71.032],
  [42.309, -71.04],
  [42.305, -71.048],
  [42.298, -71.045],
  [42.288, -71.04],
  [42.296, -71.022],
  [42.29, -71.01],
  [42.276, -71.018],
  [42.268, -71.008],
  [42.26, -70.995],
  [42.25, -70.985],
  [42.185, -70.975],
];

const LAND = pathOf([...COAST, [42.185, -71.3], [42.46, -71.3]], true);
const COASTLINE = pathOf(COAST);

const ISLANDS = [
  // Thompson Island
  pathOf(
    [
      [42.321, -71.013],
      [42.3212, -71.0085],
      [42.3195, -71.0055],
      [42.315, -71.005],
      [42.3138, -71.0095],
      [42.3152, -71.0128],
    ],
    true,
  ),
  // Spectacle Island
  pathOf(
    [
      [42.3285, -70.9885],
      [42.3275, -70.9835],
      [42.3225, -70.9845],
      [42.3235, -70.9895],
    ],
    true,
  ),
];

/** Rivers as centerlines with a paper width in world units (1 unit is roughly 22 m). */
const RIVERS: { d: string; w: number }[] = [
  // Upper Charles: Watertown -> Harvard -> BU Bridge
  {
    w: 6,
    d: pathOf([
      [42.364, -71.2],
      [42.36, -71.185],
      [42.364, -71.17],
      [42.366, -71.155],
      [42.37, -71.142],
      [42.3712, -71.13],
      [42.3695, -71.1222],
      [42.365, -71.1175],
      [42.358, -71.114],
      [42.354, -71.1105],
    ]),
  },
  {
    w: 14,
    d: pathOf([
      [42.354, -71.1105],
      [42.3545, -71.1],
      [42.3552, -71.093],
    ]),
  },
  // The basin between Cambridge and Back Bay is the widest stretch.
  {
    w: 22,
    d: pathOf([
      [42.3552, -71.093],
      [42.356, -71.087],
      [42.3575, -71.082],
      [42.36, -71.077],
    ]),
  },
  {
    w: 14,
    d: pathOf([
      [42.36, -71.077],
      [42.364, -71.0725],
      [42.3675, -71.069],
    ]),
  },
  {
    w: 8,
    d: pathOf([
      [42.3675, -71.069],
      [42.3688, -71.064],
      [42.3695, -71.059],
      [42.37, -71.0565],
    ]),
  },
  // Mystic, from the harbor up past Wellington toward Medford
  {
    w: 9,
    d: pathOf([
      [42.393, -71.071],
      [42.397, -71.08],
      [42.401, -71.088],
      [42.406, -71.097],
    ]),
  },
  {
    w: 5,
    d: pathOf([
      [42.406, -71.097],
      [42.412, -71.106],
      [42.418, -71.115],
      [42.422, -71.13],
      [42.43, -71.145],
    ]),
  },
];

const PARKS = [
  // Boston Common + Public Garden
  pathOf(
    [
      [42.3578, -71.064],
      [42.356, -71.0622],
      [42.353, -71.064],
      [42.352, -71.07],
      [42.3527, -71.0718],
      [42.3555, -71.0718],
      [42.3572, -71.07],
    ],
    true,
  ),
  // Back Bay Fens
  pathOf(
    [
      [42.3465, -71.0965],
      [42.3448, -71.0915],
      [42.34, -71.093],
      [42.3385, -71.0975],
      [42.342, -71.0995],
    ],
    true,
  ),
  // Franklin Park
  pathOf(
    [
      [42.317, -71.096],
      [42.314, -71.082],
      [42.303, -71.0835],
      [42.3, -71.092],
      [42.306, -71.1],
    ],
    true,
  ),
  // Arnold Arboretum
  pathOf(
    [
      [42.307, -71.124],
      [42.3012, -71.1165],
      [42.29, -71.119],
      [42.292, -71.13],
      [42.301, -71.13],
    ],
    true,
  ),
];

const PONDS: { at: LL; r: number }[] = [
  { at: [42.385, -71.15], r: 7 }, // Fresh Pond
  { at: [42.316, -71.121], r: 4.5 }, // Jamaica Pond
  { at: [42.3385, -71.159], r: 4 }, // Chestnut Hill Reservoir
];

/* ---------------------------------------------------------------------- */
/* Origami scenery                                                         */
/* ---------------------------------------------------------------------- */

type Art = (p: OrigamiProps) => React.JSX.Element;

/** viewBox aspect (w / h) of each origami piece, so we can center it on its baseline. */
const ASPECT = new Map<Art, number>([
  [Brownstone, 44 / 70],
  [TripleDecker, 46 / 70],
  [StateHouse, 70 / 66],
  [CustomHouse, 40 / 96],
  [OldNorth, 36 / 92],
  [Zakim, 120 / 54],
  [Citgo, 40 / 50],
  [BackBayTowers, 60 / 110],
  [Fenway, 64 / 60],
  [GreatDome, 64 / 56],
  [SeaportCrane, 66 / 80],
  [SwanBoat, 40 / 26],
  [PaperTree, 20 / 32],
  [PaperElm, 26 / 32],
  [PaperCloud, 40 / 18],
  [PaperWaves, 80 / 10],
]);

interface Piece {
  Art: Art;
  at: LL;
  /** Height in world units. */
  h: number;
  tint?: string;
  /** No ground shadow (water decor, clouds). */
  flat?: boolean;
}

/** Big recognisable landmarks: appear once you're at neighborhood zoom. */
const LANDMARKS: Piece[] = [
  { Art: StateHouse, at: [42.3592, -71.0652], h: 20 },
  { Art: CustomHouse, at: [42.3593, -71.0535], h: 27 },
  { Art: OldNorth, at: [42.3668, -71.0548], h: 22 },
  { Art: Zakim, at: [42.3692, -71.0652], h: 14 },
  { Art: Citgo, at: [42.3512, -71.099], h: 13 },
  { Art: Fenway, at: [42.3458, -71.0985], h: 14 },
  { Art: BackBayTowers, at: [42.3478, -71.08], h: 30 },
  { Art: GreatDome, at: [42.3597, -71.0935], h: 16 },
  { Art: SeaportCrane, at: [42.3462, -71.0345], h: 21 },
];

/** Street-level filler: rowhouses, triple-deckers, trees. Only when zoomed right in. */
const FILLER: Piece[] = [
  { Art: SwanBoat, at: [42.3546, -71.0706], h: 3.2, flat: true },
  ...([
    [42.3552, -71.066],
    [42.3545, -71.064],
    [42.3538, -71.0672],
    [42.356, -71.0685],
    [42.3533, -71.065],
  ] as LL[]).map((at) => ({ Art: PaperElm, at, h: 4.2 })),
  ...([
    [42.3522, -71.0805],
    [42.352, -71.0822],
    [42.3518, -71.0839],
  ] as LL[]).map((at, i) => ({ Art: Brownstone, at, h: 6, tint: ["#a45a3c", "#8d4f3a", "#b0694a"][i] })),
  ...([
    [42.358, -71.069],
    [42.3577, -71.0674],
  ] as LL[]).map((at) => ({ Art: Brownstone, at, h: 5, tint: "#9c5638" })),
  ...([
    [42.3415, -71.072],
    [42.3412, -71.0738],
  ] as LL[]).map((at) => ({ Art: Brownstone, at, h: 5, tint: "#7f4a3a" })),
  ...([
    [42.388, -71.1],
    [42.3872, -71.1016],
    [42.305, -71.061],
    [42.3044, -71.0628],
    [42.336, -71.044],
    [42.3354, -71.0458],
    [42.315, -71.108],
    [42.368, -71.1],
  ] as LL[]).map((at, i) => ({ Art: TripleDecker, at, h: 6, tint: ["#7f9bb0", "#c9b26a", "#8fae8a", "#b98b7a"][i % 4] })),
  ...([
    [42.3435, -71.095],
    [42.342, -71.0935],
    [42.3445, -71.097],
    [42.31, -71.09],
    [42.308, -71.088],
    [42.311, -71.087],
    [42.306, -71.092],
    [42.298, -71.122],
    [42.296, -71.124],
    [42.3, -71.126],
    [42.3565, -71.076],
    [42.3555, -71.079],
    [42.355, -71.083],
  ] as LL[]).map((at, i) => ({ Art: i % 3 === 1 ? PaperElm : PaperTree, at, h: 4.5, tint: i % 2 ? "#4f8a5b" : "#5f9a5e" })),
];

/** Harbor and river decor: waves and a couple of drifting clouds. */
const WATER_DECOR: Piece[] = [
  ...([
    [42.342, -71.0],
    [42.325, -71.006],
    [42.36, -71.04],
    [42.32, -71.025],
    [42.3, -71.0],
    [42.37, -71.002],
  ] as LL[]).map((at) => ({ Art: PaperWaves, at, h: 2.2, flat: true, tint: "#2f5d7c" })),
  ...([
    [42.3562, -71.0875],
    [42.3552, -71.0985],
  ] as LL[]).map((at) => ({ Art: PaperWaves, at, h: 1.4, flat: true, tint: "#2f5d7c" })),
  { Art: PaperCloud, at: [42.29, -70.997], h: 6, flat: true },
  { Art: PaperCloud, at: [42.4, -71.005], h: 5, flat: true },
];

function PieceAt({ Art, at, h, tint, flat }: Piece) {
  const p = projectLatLng(at[0], at[1]);
  const w = h * (ASPECT.get(Art) ?? 1);
  return (
    <g transform={`translate(${(p.x - w / 2).toFixed(1)} ${(p.y - h).toFixed(1)})`}>
      {flat ? null : <ellipse cx={w * 0.55} cy={h} rx={w * 0.55} ry={Math.max(0.6, h * 0.07)} fill="rgba(74,52,22,0.2)" />}
      <Art height={h} tint={tint} />
    </g>
  );
}

/* ---------------------------------------------------------------------- */
/* Neighborhood names (handwritten, constant screen size)                  */
/* ---------------------------------------------------------------------- */

/** Towns: shown zoomed out, hidden once station labels take over. */
const TOWNS: [string, LL][] = [
  ["Cambridge", [42.3705, -71.108]],
  ["Somerville", [42.3925, -71.098]],
  ["Medford", [42.421, -71.102]],
  ["Malden", [42.4265, -71.055]],
  ["Revere", [42.425, -71.012]],
  ["East Boston", [42.381, -71.018]],
  ["Dorchester", [42.296, -71.071]],
  ["Quincy", [42.258, -71.04]],
  ["Brookline", [42.329, -71.135]],
  ["Newton", [42.343, -71.205]],
  ["Roxbury", [42.322, -71.084]],
];

/** Neighborhoods: appear at street zoom. */
const HOODS: [string, LL][] = [
  ["Back Bay", [42.3505, -71.0845]],
  ["Beacon Hill", [42.3592, -71.0688]],
  ["North End", [42.3648, -71.0528]],
  ["South End", [42.3405, -71.0705]],
  ["Seaport", [42.3505, -71.0365]],
  ["South Boston", [42.3335, -71.0455]],
  ["Charlestown", [42.3795, -71.063]],
  ["Fenway", [42.3425, -71.1015]],
  ["Allston", [42.3555, -71.1325]],
  ["Jamaica Plain", [42.3125, -71.1165]],
];

function Names({ list, size }: { list: [string, LL][]; size: number }) {
  return (
    <>
      {list.map(([name, at]) => {
        const p = projectLatLng(at[0], at[1]);
        return (
          <g key={name} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <text className={`${css.inv} ${css.hood}`} textAnchor="middle" fontSize={size} opacity={0.92}>
              {name}
            </text>
          </g>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Layers                                                                  */
/* ---------------------------------------------------------------------- */

const W = WORLD.width;
const H = WORLD.height;

/** Base paper: table shadow, water sheet, shore band, land sheet with drop shadow, parks, ponds, rivers. */
export const MapBase = memo(function MapBase() {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {/* The whole map is one sheet lying on the kraft table. */}
      <rect className={`${css.sheetShadow} ${css.dropLg}`} x={0} y={0} width={W} height={H} rx={6} />
      <rect className={css.water} x={0} y={0} width={W} height={H} rx={6} />
      <path className={css.shore} d={COASTLINE} vectorEffect="non-scaling-stroke" />
      {ISLANDS.map((d, i) => (
        <path key={`is${i}`} className={css.shore} d={d} vectorEffect="non-scaling-stroke" />
      ))}
      <clipPath id="hunt-sheet">
        <rect x={0} y={0} width={W} height={H} rx={6} />
      </clipPath>
      <g clipPath="url(#hunt-sheet)">
        {/* Land is cut card stock laid over the harbor: a soft and a tight shadow fall onto the water. */}
        <path className={`${css.landShadowSoft} ${css.dropLg}`} d={LAND} />
        <path className={`${css.landShadow} ${css.dropSm}`} d={LAND} />
        <path className={css.land} d={LAND} vectorEffect="non-scaling-stroke" />
        {ISLANDS.map((d, i) => (
          <g key={`il${i}`}>
            <path className={`${css.landShadow} ${css.dropSm}`} d={d} />
            <path className={css.land} d={d} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
      {PARKS.map((d, i) => (
        <g key={`pk${i}`}>
          <path className={`${css.landShadow} ${css.dropSm}`} d={d} />
          <path className={css.park} d={d} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {PONDS.map(({ at, r }, i) => {
        const p = projectLatLng(at[0], at[1]);
        return <circle key={`pd${i}`} className={css.pond} cx={p.x} cy={p.y} r={r} vectorEffect="non-scaling-stroke" />;
      })}
      {/* Rivers read as channels cut into the land sheet: a deeper rim with the water paper inside. */}
      {RIVERS.map((r, i) => (
        <path key={`rr${i}`} className={css.riverRim} d={r.d} strokeWidth={r.w + 1.6} />
      ))}
      {RIVERS.map((r, i) => (
        <path key={`rv${i}`} className={css.river} d={r.d} strokeWidth={r.w} />
      ))}
    </g>
  );
});

/** Origami scenery + names. Split into detail tiers that CSS reveals by zoom (data-lod on the <svg>). */
export const MapScenery = memo(function MapScenery() {
  return (
    <g aria-hidden="true" pointerEvents="none">
      <g className={css.lod1}>
        {WATER_DECOR.map((p, i) => (
          <PieceAt key={`w${i}`} {...p} />
        ))}
      </g>
      <g className={css.lod2}>
        {LANDMARKS.map((p, i) => (
          <PieceAt key={`l${i}`} {...p} />
        ))}
      </g>
      <g className={css.lod3}>
        {FILLER.map((p, i) => (
          <PieceAt key={`f${i}`} {...p} />
        ))}
      </g>
    </g>
  );
});

/** Handwritten area names, above the routes so they stay legible. */
export const MapNames = memo(function MapNames() {
  return (
    <g aria-hidden="true" pointerEvents="none">
      <g className={css.upTo2}>
        <Names list={TOWNS} size={18} />
      </g>
      <g className={css.lod2}>
        <Names list={HOODS} size={16} />
      </g>
    </g>
  );
});

