import type { HealthResponse } from "@/contracts";
import { pingDb } from "@/server/db";
import { handle, json } from "@/server/http";

export const GET = handle(async () => {
  const body: HealthResponse = { ok: true, time: new Date().toISOString(), db: await pingDb() };
  return json(body);
});
