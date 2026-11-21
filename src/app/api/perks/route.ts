import { handle, json } from "@/server/http";
import { perkCatalog } from "@/server/perks";
export const dynamic="force-dynamic";
export const GET=handle(async()=>json(await perkCatalog(),{headers:{"Cache-Control":"no-store"}}));
