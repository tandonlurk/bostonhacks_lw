// POST /api/rides/sample  (owner: A, T04). Spec: docs/KICKOFF.md section 5.
import { handle, json, readJson } from "@/server/http";
import { handleSample, parseSample } from "@/server/rides/service";

export const POST = handle(async (req: Request) => json(await handleSample(parseSample(await readJson(req)))));
