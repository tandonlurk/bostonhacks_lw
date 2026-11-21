"use client";

import { useEffect, useRef, useState } from "react";
import type { SubmitTriviaResponse, TriviaRound } from "@/contracts";
import { triviaRoundFixture } from "@/contracts/game-fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";
import { CheckIcon, StarIcon } from "@/components/icons";
import type { StationGame } from "./placeholderGames";
import { primaryButton, secondaryButton } from "./styles";

async function request<T>(url: string, body: unknown): Promise<T> {
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error?.message??"Could not finish this round. Try again.");
  return data;
}
export function TriviaGame({stopId,game,onExit,riderId,onEarned}: {stopId:string;game:StationGame;onExit:()=>void;riderId:string|null;onEarned:()=>void}) {
  const [round,setRound]=useState<TriviaRound|null>(null);
  const [answers,setAnswers]=useState<(string|null)[]>([null,null,null]);
  const [index,setIndex]=useState(0);
  const [result,setResult]=useState<SubmitTriviaResponse|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const mounted=useRef(true);
  const pending=useRef(false);
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{title.current?.focus();},[index,result,round]);
  async function start() {
    if(!riderId || pending.current) return;
    pending.current=true;setBusy(true);setError("");
    try {
      const next=USE_MOCKS?{...triviaRoundFixture,stopId}:await request<TriviaRound>("/api/hunts/trivia/start",{riderId,stopId});
      if(mounted.current){setRound(next);setAnswers([null,null,null]);setIndex(0);setResult(null);}
    }catch(e){if(mounted.current)setError((e as Error).message);}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  async function submit() {
    if(!round || !riderId || pending.current) return;
    pending.current=true;setBusy(true);setError("");
    try {
      let next:SubmitTriviaResponse;
      if(USE_MOCKS){const correctAnswers=["Blue","Downtown Crossing","Your team's city district"];const correct=answers.filter((a,i)=>a===correctAnswers[i]).length;next={correct,total:3,pointsAwarded:0,tokensAwarded:0,alreadyDone:false,correctAnswers};}
      else next=await request<SubmitTriviaResponse>("/api/hunts/trivia/submit",{riderId,roundId:round.roundId,answers});
      if(mounted.current){setResult(next);onEarned();}
    }catch(e){if(mounted.current)setError((e as Error).message);}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  const q=round?.questions[index];
  return <div style={{display:"grid",gap:18,padding:"8px 0"}}>
    {error&&<p role="alert" style={{padding:14,borderRadius:14,background:"rgba(255,77,61,.12)",fontSize:16,lineHeight:1.5}}>{error}</p>}
    {!round?<>
      <div style={{padding:22,borderRadius:22,background:"linear-gradient(135deg,#7cc4ff24,#e4ff3a12)",border:"1px solid var(--border)"}}>
        <p style={{fontSize:14,color:"var(--muted)"}}>{game.title}</p>
        <h3 ref={title} tabIndex={-1} style={{fontSize:32,lineHeight:1.1,marginTop:10}}>Know your T.<br/>Grow your city.</h3>
        <p style={{fontSize:16,lineHeight:1.55,color:"var(--muted)",marginTop:16}}>Three questions. Take your time. Earn up to 15 points during a delay on this line, once per station each day.</p>
        <p style={{fontSize:14,lineHeight:1.5,color:"var(--muted)",marginTop:12}}>No delay? Play a practice round. Tokens come from your total points: one for every ten.</p>
      </div>
      {riderId?<button type="button" disabled={busy} onClick={start} style={{...primaryButton,minHeight:52,fontSize:16}}>{busy?"Preparing round…":"Start round"}</button>:<p style={{fontSize:16}}>Join a line on the Ride tab to play.</p>}
    </>:result?<>
      <div style={{display:"grid",justifyItems:"center",gap:12,padding:18,textAlign:"center"}}>
        <StarIcon size={40} style={{color:"var(--accent)"}}/>
        <h3 ref={title} tabIndex={-1} style={{fontSize:46}}>{result.correct}/{result.total}</h3>
        <p style={{fontSize:22,fontWeight:750}}>{result.correct===3?"Conductor energy.":"Another stop, a little wiser."}</p>
        <p role="status" style={{fontSize:18,color:"var(--accent)",fontWeight:700}}>{result.pointsAwarded>0?`+${result.pointsAwarded} points · +${result.tokensAwarded} tokens`:USE_MOCKS?"Practice round":result.alreadyDone?"Reward already banked today":"Practice round · no points awarded"}</p>
      </div>
      <div style={{display:"grid",gap:10}}>{round.questions.map((question,i)=><div key={question.id} style={{padding:14,borderRadius:14,background:"var(--surface-2)",fontSize:16,lineHeight:1.4}}><p>{question.prompt}</p><p style={{color:answers[i]===result.correctAnswers[i]?"var(--glow-green)":"var(--muted)",marginTop:7}}>{answers[i]===result.correctAnswers[i]?"✓ ":"Answer: "}{result.correctAnswers[i]}</p></div>)}</div>
      <div style={{display:"flex",gap:10}}><button style={{...secondaryButton,flex:1}} type="button" onClick={onExit}>Other games</button><button style={{...primaryButton,flex:1}} type="button" disabled={busy} onClick={start}>{busy?"Preparing…":"Play again"}</button></div>
    </>:q?<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,fontSize:14,color:"var(--muted)"}}><span>QUESTION {index+1} OF {round.questions.length}</span><span>{round.rewardAvailable?"Up to +15 points":"Practice round"}</span></div>
      <div style={{display:"flex",gap:6}} aria-hidden="true">{round.questions.map((_,i)=><span key={i} style={{height:4,flex:1,borderRadius:3,background:i<=index?"var(--accent)":"var(--surface-3)"}}/>)}</div>
      <h3 ref={title} tabIndex={-1} style={{fontSize:26,lineHeight:1.2,minHeight:64}}>{q.prompt}</h3>
      <div role="group" aria-label="Answer choices" style={{display:"grid",gap:10}}>{q.options.map(option=><button type="button" key={option} aria-pressed={answers[index]===option} onClick={()=>setAnswers(prev=>prev.map((a,i)=>i===index?option:a))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,minHeight:56,borderRadius:16,padding:"14px 16px",textAlign:"left",fontSize:16,border:answers[index]===option?"2px solid var(--accent)":"2px solid var(--border)",background:answers[index]===option?"#e4ff3a16":"var(--surface-2)"}}>{option}{answers[index]===option&&<CheckIcon size={20}/>}</button>)}</div>
      <div style={{display:"flex",gap:10}}>{index>0&&<button type="button" disabled={busy} onClick={()=>setIndex(i=>i-1)} style={secondaryButton}>Back</button>}<button type="button" disabled={busy||!answers[index]} onClick={()=>index<round.questions.length-1?setIndex(i=>i+1):submit()} style={{...primaryButton,flex:1,minHeight:52,fontSize:16,opacity:busy||!answers[index]?0.55:1}}>{busy?"Banking your round…":index<round.questions.length-1?"Next question":"Finish round"}</button></div>
      <p style={{fontSize:14,color:"var(--muted)",lineHeight:1.5}}>Your answers are checked together at the end. Round expires after ten minutes.</p>
    </>:null}
  </div>;
}
