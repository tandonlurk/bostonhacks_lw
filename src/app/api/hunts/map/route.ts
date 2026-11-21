import { clientIp, handle, json, rateLimit } from "@/server/http";
import { stationGames } from "@/server/hunts/map";
export const GET = handle(async (req: Request) => {
  rateLimit(`huntmap:${clientIp(req)}`,60,60000);
  return json(await stationGames(),{headers:{"Cache-Control":"no-store"}});
});
