// POST /api/delay/simulate { teamRouteId, active }  (owner: A, T07). Demo switch.
// If ADMIN_TOKEN is set, requires header `x-admin-token`.
import { isTeamRouteId } from "@/contracts";
import { getDelay, setSimulatedDelay } from "@/server/delay";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";

export const POST = handle(async (req: Request) => {
  rateLimit(`simulate:${clientIp(req)}`, 30, 60_000);
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers.get("x-admin-token") !== token)
    throw new HttpError(401, "unauthorized", "Admin token required.");
  const body = (await readJson<Record<string, unknown>>(req)) ?? {};
  if (!isTeamRouteId(body.teamRouteId)) throw new HttpError(400, "bad_team", "teamRouteId must be a team id.");
  if (typeof body.active !== "boolean") throw new HttpError(400, "bad_active", "active must be true or false.");
  await setSimulatedDelay(body.teamRouteId, body.active);
  return json(await getDelay(body.teamRouteId), { headers: { "cache-control": "no-store" } });
});
