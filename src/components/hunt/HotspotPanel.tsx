"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Hotspot, HotspotsResponse, MeetRequest, MeetResponse } from "@/contracts";
import { meetMatchedFixture, meetWaitingFixture } from "@/contracts/fixtures";
import { TEAMS } from "@/contracts/routes";
import { STATIONS } from "@/components/map/mbta-geo";
import { USE_MOCKS } from "@/hooks/useMocks";
import { hotspotJson, useHotspots } from "./useHotspots";
import s from "./hotspots.module.css";

interface Props {
  riderId: string | null;
  onSelect?: (hotspot: Hotspot) => void;
  onHotspots?: (hotspots: Hotspot[]) => void;
  onEarned?: () => void;
}

export function HotspotPanel({ riderId, onSelect, onHotspots, onEarned }: Props) {
  const { data, error, loading, refresh } = useHotspots(riderId);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const generateVersion = useRef(0);

  const close = useCallback(() => { setOpen(false); setSelected(null); opener.current?.focus(); }, []);
  useEffect(() => { onHotspots?.(data?.hotspots ?? []); }, [data, onHotspots]);
  useEffect(() => () => { generateVersion.current += 1; }, [riderId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => [...dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]') ?? []];
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const nodes = focusables();
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  async function generate() {
    if (!riderId || generating) return;
    const current = ++generateVersion.current;
    setGenerating(true); setGenerateError(null);
    try {
      if (!USE_MOCKS) await hotspotJson<HotspotsResponse>("/api/hotspots/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ riderId }) });
      if (generateVersion.current === current) refresh();
    } catch (error) {
      if (generateVersion.current === current) setGenerateError(error instanceof Error ? error.message : "Couldn’t find a new route.");
    } finally { if (generateVersion.current === current) setGenerating(false); }
  }

  const hotspots = USE_MOCKS && data ? data.hotspots : data?.hotspots ?? [];
  return <>
    <button ref={opener} type="button" className={s.launcher} onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span className={s.spark} aria-hidden="true">✳</span><span>Hotspots</span><span className={s.miniBadge}>{hotspots.length || "5×"}</span>
    </button>
    {open && createPortal(<div className={s.overlay}>
      <button type="button" tabIndex={-1} className={s.scrim} aria-label="Close hotspots" onClick={close} />
      <div ref={dialog} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="hotspot-heading">
        <div className={s.handle} aria-hidden="true" />
        <div className={s.topline}><p className={s.eyebrow}>A different way to get there</p><button type="button" onClick={close} className={s.close} aria-label="Close hotspots">×</button></div>
        {selected && riderId ? <HotspotMeet key={`${riderId}:${selected.id}`} hotspot={selected} riderId={riderId} onBack={() => setSelected(null)} onEarned={onEarned} /> : <>
          <h2 id="hotspot-heading" className={s.heading}>Same city.<br /><span>New connections.</span></h2>
          <p className={s.intro}>Take a new route. Meet another rider at your hotspot. You both earn a 5× meeting bonus.</p>
          {USE_MOCKS && <p className={s.preview}>Preview mode · sample routes and rewards</p>}
          {!riderId ? <div className={s.empty}><h3>Your next connection starts with a ride.</h3><p>Join a team to log trips and find alternate routes with people who share your interests.</p><Link className={s.primary} href="/" onClick={close}>Join your line</Link></div> : <>
            {loading && <p role="status" className={s.status}>Finding your routes…</p>}
            {error && <p role="alert" className={s.error}>{error} <button className={s.inline} type="button" onClick={refresh}>Retry</button></p>}
            {data && !data.eligible && <div className={s.progressCard}><div className={s.progressTitle}><strong>Get to know your commute</strong><span>{Math.min(data.tripsLogged, data.tripsNeeded)} / {data.tripsNeeded} trips</span></div><progress aria-label="Trips until hotspots unlock" value={Math.min(data.tripsLogged, data.tripsNeeded)} max={data.tripsNeeded} /><p>Finish {Math.max(0, data.tripsNeeded - data.tripsLogged)} more {data.tripsNeeded - data.tripsLogged === 1 ? "ride" : "rides"} to reveal a different route to a familiar destination.</p></div>}
            {data?.eligible && hotspots.length === 0 && <div className={s.empty}><h3>No detour just yet.</h3><p>Your completed trips need a route with an alternate station. Keep riding, or check for a fresh route.</p></div>}
            <div className={s.cards}>{hotspots.map((hotspot) => <article key={hotspot.id} className={s.card}>
              <div className={s.cardTop}><span className={s.eyebrow}>YOUR NEXT STOP</span><span className={s.reward}>+{hotspot.meetPoints} pts <small>{hotspot.multiplier}×</small></span></div>
              <h3>{hotspot.name}</h3><p>{hotspot.reason}</p>
              <div className={s.lines}>{hotspot.viaRouteIds.map((line) => <span key={line}><i style={{ background: TEAMS[line].color }} />{line} Line</span>)}</div>
              <details className={s.route}><summary>See your alternate route</summary><ol>{hotspot.path.map((id, i) => <li key={`${id}:${i}`} className={id === hotspot.stationId ? s.routeStop : undefined}>{STATIONS[id]?.name ?? (id === hotspot.stationId ? hotspot.name : "Station")}</li>)}</ol></details>
              {hotspot.sharedWith > 0 && <p className={s.people}>{hotspot.sharedWith} {hotspot.sharedWith === 1 ? "rider shares" : "riders share"} this stop{hotspot.sharedInterests.length ? ` · ${hotspot.sharedInterests.join(" + ")}` : ""}</p>}
              <div className={s.actions}><button className={s.secondary} type="button" onClick={() => { onSelect?.(hotspot); close(); }}>Show on map</button><button className={s.primary} type="button" onClick={() => setSelected(hotspot)}>Meet here</button></div>
            </article>)}</div>
            <button className={s.refresh} type="button" disabled={generating || loading} onClick={generate}>{generating ? "Looking for routes…" : "Find a fresh route"}</button>
            <p className={s.note}>Hotspots follow your completed trips and interests.</p>
            {generateError && <p role="alert" className={s.error}>{generateError}</p>}
          </>}
        </>}
      </div>
    </div>, document.body)}
  </>;
}

interface Fix { lat: number; lng: number; accuracy: number }
function locationFix(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("This browser can’t find your location. You can still explore the route.")); return; }
    navigator.geolocation.getCurrentPosition((position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }), (error) => reject(new Error(error.code === 1 ? "Location is blocked. Allow it in site settings to verify you’re at the hotspot." : "Couldn’t find your location. Check location services and try again.")), { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
  });
}

function HotspotMeet({ hotspot, riderId, onBack, onEarned }: { hotspot: Hotspot; riderId: string; onBack: () => void; onEarned?: () => void }) {
  const [result, setResult] = useState<MeetResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState(USE_MOCKS);
  const [now, setNow] = useState(0);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const fix = useRef<Fix | null>(null);
  const inflight = useRef(false);
  const [demoAvailable, setDemoAvailable] = useState(USE_MOCKS);
  useEffect(() => {
    if (USE_MOCKS) return;
    const abort = new AbortController();
    void fetch("/api/demo/status", { cache: "no-store", signal: abort.signal }).then(async (response) => response.ok ? await response.json() : null).then((status) => { if (!abort.signal.aborted) setDemoAvailable(status?.running === true); }).catch(() => {});
    return () => abort.abort();
  }, []);
  const earned = useRef(onEarned);
  useEffect(() => { earned.current = onEarned; }, [onEarned]);
  useEffect(() => () => { request.current += 1; controller.current?.abort(); }, []);

  const send = useCallback(async (coords: Fix, partnerCode?: string) => {
    const version = ++request.current;
    controller.current?.abort(); controller.current = new AbortController();
    inflight.current = true;
    try {
      const body: MeetRequest = { riderId, hotspotId: hotspot.id, ...coords, ...(partnerCode ? { code: partnerCode } : {}) };
      const response = USE_MOCKS
        ? partnerCode ? { ...meetMatchedFixture, expiresAt: new Date(Date.now() + 30000).toISOString() } : { ...meetWaitingFixture, expiresAt: new Date(Date.now() + 30000).toISOString() }
        : await hotspotJson<MeetResponse>("/api/hotspots/meet", { method: "POST", signal: controller.current.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (request.current !== version) return;
      setResult(response); setNow(Date.now()); setError(null); setWaiting(response.status === "waiting");
      if (response.status === "matched") earned.current?.();
    } catch (error) {
      if (request.current === version && !controller.current.signal.aborted) { setError(error instanceof Error ? error.message : "Couldn’t connect with that rider."); setWaiting(false); }
    } finally { if (request.current === version) { setBusy(false); inflight.current = false; } }
  }, [riderId, hotspot.id]);

  useEffect(() => {
    if (!waiting || !result) return;
    const expiry = Date.parse(result.expiresAt);
    const timer = window.setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= expiry) { setWaiting(false); return; }
      if (!inflight.current && fix.current && !USE_MOCKS) void send(fix.current);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [waiting, result, send]);

  async function begin(partnerCode?: string) {
    if (busy || result?.status === "matched") return;
    setBusy(true); setError(null); setWaiting(false);
    const version = ++request.current;
    controller.current?.abort();
    try {
      const coords = demo && demoAvailable ? { lat: hotspot.lat, lng: hotspot.lng, accuracy: 1 } : await locationFix();
      if (request.current !== version) return;
      fix.current = coords;
      await send(coords, partnerCode);
    } catch (error) {
      if (request.current === version) { setError(error instanceof Error ? error.message : "Location isn’t available."); setBusy(false); }
    }
  }
  function cancel() { request.current += 1; controller.current?.abort(); inflight.current = false; setWaiting(false); setBusy(false); setResult(null); }
  function submit(event: FormEvent) { event.preventDefault(); if (/^\d{4}$/.test(code)) void begin(code); }
  const remaining = result ? Math.max(0, Math.ceil((Date.parse(result.expiresAt) - now) / 1000)) : 0;
  const expired = result?.status === "expired" || (result?.status === "waiting" && !waiting && remaining === 0);
  return <div className={s.meet}>
    <button type="button" className={s.back} onClick={() => { cancel(); onBack(); }}>Back to hotspots</button>
    <p className={s.eyebrow}>MEET AT {hotspot.name}</p>
    <h2 id="hotspot-heading" className={s.heading}>{result?.status === "matched" ? "A new connection." : "Good things\nhappen together."}</h2>
    {USE_MOCKS && <p className={s.preview}>Preview mode · no real points are awarded</p>}
    <div className={`${s.phoneArt} ${waiting ? s.pairing : ""}`} aria-hidden="true"><span>t</span><i>✳</i><span>t</span></div>
    {result?.status === "matched" ? <div className={s.success} role="status"><span className={s.bigReward}>+{result.pointsAwarded}<small> {USE_MOCKS ? "preview points" : "points"}</small></span><h3>{result.partner ? `You met ${result.partner.displayName}.` : "You’re connected."}</h3><p>{result.message}</p><p className={s.note}>One reward per pair, per hotspot, per day. Meet someone new for another bonus.</p><button type="button" className={s.primary} onClick={onBack}>Find your next stop</button></div> : <>
      <p className={s.intro}>Both riders tap Bump at {hotspot.name} within a few seconds. Or share a four-digit code. No NFC needed.</p>
      {waiting && result && <div className={s.codeCard} role="status"><span>Your pairing code</span><strong className={s.code}>{result.code}</strong><span>Share with your partner · expires in {remaining}s</span><span className={s.waitLabel}>Waiting for another rider…</span></div>}
      {expired && <p className={s.status} role="status">This pairing window has closed. Tap Bump again for a fresh code.</p>}
      {!waiting && <button type="button" className={s.primary} disabled={busy} onClick={() => void begin()}>{busy ? "Finding you…" : expired ? "Bump again" : "Bump phones"}</button>}
      <form className={s.codeForm} onSubmit={submit}><label htmlFor="hotspot-partner-code">Have their code?</label><div><input id="hotspot-partner-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" placeholder="0000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} disabled={busy} /><button className={s.secondary} type="submit" disabled={busy || code.length !== 4}>Pair by code</button></div></form>
      {waiting && <button type="button" className={s.refresh} onClick={cancel}>Stop looking</button>}
      {demoAvailable && !waiting && !busy && <label className={s.demoToggle}><input type="checkbox" checked={demo} disabled={USE_MOCKS} onChange={(event) => { setDemo(event.target.checked); fix.current = null; }} />Use simulated location</label>}
      {demo && demoAvailable && <p className={s.preview}>Simulated location at {hotspot.name}.</p>}
      <p className={s.note}>Real meetings need location within 150 m of the station.</p>
      {error && <p className={s.error} role="alert">{error}</p>}
    </>}
  </div>;
}
