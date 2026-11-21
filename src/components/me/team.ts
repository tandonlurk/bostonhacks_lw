import type { TeamRouteId } from "@/contracts/routes";

/** Bright stroke color for a team on the dark theme, e.g. var(--glow-green). */
export function glowVar(team: TeamRouteId) {
  return `var(--glow-${team.toLowerCase()})`;
}

/** Brand fill color for a team, e.g. var(--line-green). */
export function lineVar(team: TeamRouteId) {
  return `var(--line-${team.toLowerCase()})`;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
