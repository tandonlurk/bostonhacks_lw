import type { RedeemPerkRequest } from "@/contracts";
import { apiError, handle, json, readJson } from "@/server/http";
import { redeemPerk } from "@/server/perks";
import { ScoringError } from "@/server/points/rules";
export const POST=handle(async(req:Request)=>{
  const body=await readJson<RedeemPerkRequest>(req);
  try{return json(await redeemPerk(body?.riderId,body?.perkId));}
  catch(error){if(error instanceof ScoringError)return apiError(error.status,error.code,error.message);throw error;}
});
