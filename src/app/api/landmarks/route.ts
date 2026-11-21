import { apiError, handle, json } from "@/server/http";
import { landmarksNear } from "@/server/landmarks";
import { ScoringError } from "@/server/points/rules";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const numeric = (key: string) => params.has(key) ? params.get(key)?.trim() ? Number(params.get(key)) : NaN : undefined;
  try { return json(await landmarksNear({lat:numeric("lat"),lng:numeric("lng"),radiusM:numeric("radiusM"),riderId:params.get("riderId")??undefined}), {headers:{"Cache-Control":"no-store"}}); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status,error.code,error.message); throw error; }
});
