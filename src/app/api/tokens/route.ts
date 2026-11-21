import { after } from "next/server";
import { apiError, handle, json } from "@/server/http";
import { tokenWallet } from "@/server/tokens";
import { ScoringError } from "@/server/points/rules";
export const dynamic="force-dynamic";
export const GET=handle(async(req:Request)=>{
  try{
    const riderId=new URL(req.url).searchParams.get("riderId")??"";
    const wallet=await tokenWallet(riderId);
    if(process.env.SOLANA_DEVNET_ENABLED==="1") after(async()=>{
      const {mirrorPendingAwards}=await import("@/server/tokens/devnet");
      await mirrorPendingAwards(riderId);
    });
    return json(wallet,{headers:{"Cache-Control":"no-store"}});
  }
  catch(error){if(error instanceof ScoringError)return apiError(error.status,error.code,error.message);throw error;}
});
