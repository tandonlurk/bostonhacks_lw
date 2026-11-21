// GET /api/riders/:id/friends  (owner: A). Friends with live whereabouts (polled every ~5 s).
import type { FriendsResponse } from "@/contracts";
import { clientIp, handle, json, rateLimit } from "@/server/http";
import { getFriends } from "@/server/riders/friends";

export const GET = handle(async (req: Request) => {
  rateLimit(`friends:${clientIp(req)}`, 60, 60_000);
  return json<FriendsResponse>(await getFriends(), { headers: { "cache-control": "no-store" } });
});
