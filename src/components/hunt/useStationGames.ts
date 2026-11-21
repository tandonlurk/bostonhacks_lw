"use client";
import { useCallback, useEffect, useState } from "react";
import type { HuntMapResponse } from "@/contracts";
import { USE_MOCKS } from "@/hooks/useMocks";
export function useStationGames() {
  const [data,setData]=useState<HuntMapResponse|null>(null);
  const [error,setError]=useState(false);
  const [tick,setTick]=useState(0);
  const refresh=useCallback(()=>setTick(t=>t+1),[]);
  useEffect(()=>{
    if(USE_MOCKS)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    async function poll(){
      try{const res=await fetch("/api/hunts/map",{cache:"no-store",signal:controller.signal});if(!res.ok)throw Error("unavailable");const next:HuntMapResponse=await res.json();if(!controller.signal.aborted){setData(next);setError(false);}}
      catch{if(!controller.signal.aborted)setError(true);}
      if(!controller.signal.aborted)timer=setTimeout(poll,20000);
    }
    poll();return()=>{controller.abort();clearTimeout(timer);};
  },[tick]);
  return {data,error,refresh};
}
