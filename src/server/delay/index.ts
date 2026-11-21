// Delay detection (owner: A, T07): live MBTA alerts plus a demo "simulate delay" switch.
import type { DelayResponse, TeamRouteId } from "@/contracts";
import { TEAMS, TEAM_ROUTE_IDS } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { getAlerts, type ServiceAlert } from "@/server/mbta/alerts";

/** Alert effects that count as "a delay hits" (planned closures and shuttles don't). */
const DELAY_EFFECTS = new Set(["DELAY", "SUSPENSION"]);
const MIN_SEVERITY = 3;
/** Simulated delays switch themselves off after this long, so a forgotten demo toggle can't stick. */
const SIMULATED_TTL_MS = 45 * 60_000;

interface Override {
  teamRouteId: TeamRouteId;
  active: boolean;
  message: string | null;
  startedAt: string;
}

const g = globalThis as unknown as { __tcityDelayMem?: Map<TeamRouteId, Override> };
const mem = () => (g.__tcityDelayMem ??= new Map());

const isLive = (o: Override) => o.active && Date.now() - Date.parse(o.startedAt) < SIMULATED_TTL_MS;

async function getOverrides(): Promise<Override[]> {
  if (hasDb()) {
    const rows = await getSql()<{ team_route_id: TeamRouteId; active: boolean; message: string | null; started_at: Date }[]>`
      select team_route_id, active, message, started_at from delay_overrides where active`;
    return rows
      .map((r) => ({ teamRouteId: r.team_route_id, active: r.active, message: r.message, startedAt: r.started_at.toISOString() }))
      .filter(isLive);
  }
  return [...mem().values()].filter(isLive);
}

export async function setSimulatedDelay(teamRouteId: TeamRouteId, active: boolean): Promise<void> {
  const message = active
    ? `Simulated delay on the ${TEAMS[teamRouteId].name}: trains are running about 15 minutes behind.`
    : null;
  if (hasDb()) {
    await getSql()`
      insert into delay_overrides (team_route_id, active, message, started_at)
      values (${teamRouteId}, ${active}, ${message}, now())
      on conflict (team_route_id) do update
        set active = excluded.active, message = excluded.message, started_at = excluded.started_at`;
    return;
  }
  mem().set(teamRouteId, { teamRouteId, active, message, startedAt: new Date().toISOString() });
}

function delayAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  return alerts.filter(
    (a) => DELAY_EFFECTS.has(a.effect) && a.severity >= MIN_SEVERITY && a.startedAt !== null && a.teamRouteIds.length > 0,
  );
}

const NONE: DelayResponse = { active: false, source: "none", teamRouteIds: [], message: null, startedAt: null };

/**
 * Current delay status. With a team, only that line is considered; without one, all lines are
 * aggregated. Simulated delays win over real alerts so the demo is predictable.
 */
export async function getDelay(teamRouteId?: TeamRouteId): Promise<DelayResponse> {
  const teams = teamRouteId ? [teamRouteId] : [...TEAM_ROUTE_IDS];
  const overrides = (await getOverrides()).filter((o) => teams.includes(o.teamRouteId));

  let alerts: ServiceAlert[] = [];
  try {
    alerts = delayAlerts(await getAlerts()).filter((a) => a.teamRouteIds.some((t) => teams.includes(t)));
  } catch (err) {
    console.warn("[delay] alerts unavailable", String(err));
  }
  alerts.sort((a, b) => b.severity - a.severity || (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));
  const alertTeams = alerts.flatMap((a) => a.teamRouteIds).filter((t) => teams.includes(t));

  if (overrides.length) {
    const first = [...overrides].sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
    return {
      active: true,
      source: "simulated",
      teamRouteIds: [...new Set([...overrides.map((o) => o.teamRouteId), ...alertTeams])],
      message: first.message,
      startedAt: first.startedAt,
    };
  }
  if (!alerts.length) return NONE;
  return {
    active: true,
    source: "alert",
    teamRouteIds: [...new Set(alertTeams)],
    message: alerts[0].header,
    startedAt: alerts[0].startedAt,
  };
}
