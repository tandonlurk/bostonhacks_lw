import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import type { LotTier } from "@/contracts";
import { BackBayTowers, Brownstone, Citgo, CustomHouse, GreatDome, PaperFlag, PaperTree, SeaportCrane, TripleDecker, type OrigamiProps } from "./paper/origami";

/** Each team's signature landmark for its top tiers (decorative). */
const LANDMARK: Record<TeamRouteId, (p: OrigamiProps) => React.JSX.Element> = {
  Red: GreatDome,
  Orange: BackBayTowers,
  Blue: CustomHouse,
  Green: Citgo,
  Silver: SeaportCrane,
};

const TIER_NAME = ["Empty lot", "Triple-decker", "Brownstone", "Mid-rise", "Landmark", "Skyline"];

interface BuildingTileProps {
  team: TeamRouteId;
  tier: LotTier;
  points: number;
  kind: string;
}

/** One district lot as a folded paper card: origami art grows with the tier, team color on the base strip. */
export function BuildingTile({ team, tier, points, kind }: BuildingTileProps) {
  const color = TEAMS[team].color;
  const Landmark = LANDMARK[team];
  const art =
    tier === 0 ? (
      <PaperTree height={22} />
    ) : tier === 1 ? (
      <TripleDecker height={34} />
    ) : tier === 2 ? (
      <Brownstone height={42} />
    ) : tier === 3 ? (
      <BackBayTowers height={52} tint="#a9b6bf" />
    ) : (
      <Landmark height={tier === 5 ? 60 : 52} />
    );
  return (
    <div
      key={tier}
      title={`${kind} · tier ${tier} · ${points} pts`}
      className="city-tile paper"
      style={{ position: "relative", width: "100%", aspectRatio: "64 / 80", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", padding: "4px 2px 0" }}
    >
      {tier === 0 ? (
        <span aria-hidden="true" style={{ position: "absolute", inset: "auto 10% 12px", height: 10, border: "1.5px dashed var(--faint)", borderRadius: 2 }} />
      ) : null}
      <div aria-hidden="true" style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 2 }}>
        {art}
        {tier >= 4 ? <PaperFlag height={18} tint={color} style={{ position: "absolute", top: -14, right: -6 }} /> : null}
      </div>
      <span aria-hidden="true" style={{ alignSelf: "stretch", height: 6, background: color, marginTop: 2 }} />
      <span className="visually-hidden">
        {TIER_NAME[tier]}, tier {tier}, {points} points
      </span>
      <span aria-hidden="true" style={{ position: "absolute", top: 3, left: 4, fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
        T{tier}
      </span>
    </div>
  );
}
