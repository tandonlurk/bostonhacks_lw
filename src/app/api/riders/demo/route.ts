// POST /api/riders/demo  (owner: A). Demo account for presentations: creates a rider with the
// onboarding profile and puts the world in demo mode so every feature is live right away:
// simulator running (Start works anywhere, demo grader), seeded trips + hotspot, and a simulated
// delay on the rider's line (photo challenges, trivia).
// Body: { displayName?, homeTeamRouteId?, interests?, avatarDataUrl? } -> 201 { riderId }
import type { CreateRiderResponse, TeamRouteId } from "@/contracts";
import { isTeamRouteId } from "@/contracts";
import { getDelay, setSimulatedDelay } from "@/server/delay";
import { getHotspots } from "@/server/hotspots";
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { parseProfilePatch } from "@/server/riders/profile";
import { createRider, updateRiderProfile } from "@/server/rides/store";
import { isSimulationRunning, simulationControl } from "@/server/sim";

export const POST = handle(async (req: Request) => {
  rateLimit(`riders-demo:${clientIp(req)}`, 10, 60_000);
  const b = ((await readJson(req).catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const name = typeof b.displayName === "string" ? b.displayName.trim().replace(/\s+/g, " ").slice(0, 24) : "";
  const team: TeamRouteId = isTeamRouteId(b.homeTeamRouteId) ? b.homeTeamRouteId : "Green";
  const profile = parseProfilePatch({
    interests: Array.isArray(b.interests) ? b.interests : ["coffee", "music"],
    ...(typeof b.avatarDataUrl === "string" ? { avatarDataUrl: b.avatarDataUrl } : {}),
  });

  const rider = await createRider(name || "Demo Rider", team);
  await updateRiderProfile(rider.id, profile);

  if (!(await isSimulationRunning())) await simulationControl("start");
  if (!(await getDelay(team)).active) await setSimulatedDelay(team, true);
  // Seeds demo trips (sim is running) so the rider has a hotspot immediately.
  await getHotspots(rider.id, true).catch((err) => console.warn("[demo] hotspot seed failed", String(err)));

  return json<CreateRiderResponse>({ riderId: rider.id }, { status: 201 });
});
