import { TEAMS, type TeamRouteId } from "@/contracts/routes";

const SHORT: Record<TeamRouteId, string> = {
  Red: "RL",
  Orange: "OL",
  Blue: "BL",
  Green: "GL",
  Silver: "SL",
};

interface LineChipProps {
  teamRouteId: TeamRouteId;
  size?: "sm" | "md";
  label?: "short" | "full";
}

export function LineChip({ teamRouteId, size = "md", label = "full" }: LineChipProps) {
  const team = TEAMS[teamRouteId];
  const text = label === "short" ? SHORT[teamRouteId] : team.name;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "2px 10px" : "4px 14px",
        borderRadius: "var(--radius-pill)",
        background: team.color,
        color: "#fff",
        fontSize: size === "sm" ? 12 : 14,
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
