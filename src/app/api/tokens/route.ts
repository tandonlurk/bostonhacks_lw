import { apiError, handle, json } from "@/server/http";
import { tokenWallet } from "@/server/tokens";
import { ScoringError } from "@/server/points/rules";
export const dynamic="force-dynamic";
export const GET=handle(async(req:Request)=>{
  try{return json(await tokenWallet(new URL(req.url).searchParams.get("riderId")??""),{headers:{"Cache-Control":"no-store"}});}
  catch(error){if(error instanceof ScoringError)return apiError(error.status,error.code,error.message);throw error;}
});
