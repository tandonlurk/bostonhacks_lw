import { apiError, handle, json, readJson } from "@/server/http";
import { simulationControl } from "@/server/sim";
import { ScoringError } from "@/server/points/rules";
import type { DemoSimRequest } from "@/contracts";
export const POST = handle(async (req: Request) => {
  if (process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) return apiError(401, "unauthorized", "Demo administrator authorization required.");
  const body = await readJson<DemoSimRequest>(req);
  try { return json(await simulationControl(body?.action)); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status, error.code, error.message); throw error; }
});
