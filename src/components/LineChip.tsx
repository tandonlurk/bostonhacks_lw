import { TEAMS, type TeamRouteId } from "@/contracts/routes";

const SHORT: Record<TeamRouteId, string> = {
  Red: "RL",
  Orange: "OL",
  Blue: "BL",
  Green: "GL",
  Silver: "SL",
};

// White text fails WCAG AA (4.5:1) against Orange (2.5:1) and Silver (3.7:1); dark text passes
// both comfortably (7.1:1, 4.9:1). Fixed hex, not the theme's --ink: these chip backgrounds are
// constant brand colors regardless of light/dark mode, so the text color must stay fixed too.
const CHIP_TEXT: Record<TeamRouteId, string> = {
  Red: "#fff",
  Orange: "#14181c",
  Blue: "#fff",
  Green: "#fff",
  Silver: "#14181c",
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
        color: CHIP_TEXT[teamRouteId],
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
