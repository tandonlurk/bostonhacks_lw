"use client";

// Hotspot meet (A's T25): an alternate-route station where meeting another rider pays a multiplied bonus.
// Web apps can't do NFC, so a "bump" is both riders tapping Bump within ~10 s (POST /api/hotspots/meet, polled every
// 2 s while waiting). Each tap also shows a 4-digit code the other rider can type instead.
import { useEffect, useRef, useState } from "react";
import type { Hotspot, MeetResponse } from "@/contracts";
import { hotspotsFixture } from "@/contracts/fixtures";
import type { TeamRouteId } from "@/contracts/routes";
import { CheckIcon, ChevronIcon, ClockIcon, TeamIcon } from "@/components/icons";
import { LineChip } from "@/components/LineChip";
import { USE_MOCKS } from "@/hooks/useMocks";
import { HOTSPOT_COLOR } from "./gameMeta";
import { BumpIcon } from "./huntIcons";
import { STATION_BY_ID } from "./mapModel";
import { eyebrow, primaryButton, secondaryButton } from "./styles";
import { HotspotError, meetHotspot } from "./hotspotMeet";

const POLL_MS = 2000;
const FIX_MAX_AGE = 60_000;

interface HotspotGameProps {
  hotspot: Hotspot;
  riderId: string | null;
  onEarned: () => void;
}

export function HotspotGame({ hotspot, riderId, onEarned }: HotspotGameProps) {
  const now = useNow(1000);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
      <Hero hotspot={hotspot} now={now} />
      <MeetPanel key={hotspot.id} hotspot={hotspot} riderId={riderId} onEarned={onEarned} now={now} />
      <RouteCard hotspot={hotspot} />
    </div>
  );
}

// ---------- hero ----------

function Hero({ hotspot, now }: { hotspot: Hotspot; now: number }) {
  const left = Date.parse(hotspot.expiresAt) - now;
  const lines = hotspot.viaRouteIds.filter((t, i, a) => a.indexOf(t) === i);
  return (
    <section
      aria-label="Hotspot"
      style={{
        padding: 16,
        borderRadius: 22,
        background: `linear-gradient(150deg, color-mix(in srgb, ${HOTSPOT_COLOR} 24%, transparent), color-mix(in srgb, ${HOTSPOT_COLOR} 4%, transparent))`,
        border: `1px solid color-mix(in srgb, ${HOTSPOT_COLOR} 38%, transparent)`,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <MultiplierTag multiplier={hotspot.multiplier} />
        <span style={{ flex: 1 }} />
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: left > 0 ? "var(--ink)" : "var(--glow-red)" }}
        >
          <ClockIcon size={15} weight={2.3} />
          {left > 0 ? (
            <>
              Ends in <span className="num">{formatLeft(left)}</span>
            </>
          ) : (
            "Expired"
          )}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span className="num" style={{ fontFamily: "var(--font-display)", fontSize: 46, fontWeight: 800, lineHeight: 0.9, color: "var(--accent)" }}>
          +{hotspot.meetPoints}
        </span>
        <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.3, paddingBottom: 2 }}>
          points each when you
          <br />
          meet a rider here
        </span>
      </div>

      <p style={{ fontSize: 14.5, lineHeight: 1.45, fontWeight: 600 }}>{hotspot.reason}</p>

      {lines.length ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }} aria-label={`Ride ${lines.map((t) => `the ${t} Line`).join(", then ")}`}>
          {lines.map((t, i) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {i ? <ChevronIcon size={12} weight={2.6} style={{ color: "var(--muted)" }} /> : null}
              <LineChip teamRouteId={t} size="sm" />
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MultiplierTag({ multiplier, small }: { multiplier: number; small?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: small ? "2px 8px" : "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: HOTSPOT_COLOR,
        color: "#fff",
        fontSize: small ? 11 : 12,
        fontWeight: 850,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      <span className="num" style={{ fontSize: small ? 12 : 14 }}>
        {multiplier}x
      </span>
      Hotspot
    </span>
  );
}

// ---------- route + who else ----------

function RouteCard({ hotspot }: { hotspot: Hotspot }) {
  const name = (id: string) => STATION_BY_ID.get(id)?.name ?? "a nearby stop";
  const at = hotspot.path.indexOf(hotspot.stationId);
  const total = Math.max(0, hotspot.path.length - 1);
  const rows: { id: string; label: string; note: string; hot?: boolean; gap?: string }[] =
    at > 0 && at < hotspot.path.length - 1
      ? [
          { id: "from", label: name(hotspot.fromStationId), note: "Your usual start", gap: stops(at) },
          { id: "hot", label: hotspot.name, note: "Hotspot", hot: true, gap: stops(total - at) },
          { id: "to", label: name(hotspot.toStationId), note: "Your usual stop" },
        ]
      : [
          { id: "from", label: name(hotspot.fromStationId), note: "Your usual start", gap: `${stops(total)} via ${hotspot.name}` },
          { id: "to", label: name(hotspot.toStationId), note: "Your usual stop" },
        ];

  return (
    <section aria-label="Alternate route" style={{ padding: 16, borderRadius: 20, background: "var(--surface-2)", display: "grid", gap: 14 }}>
      <p style={eyebrow}>Your trip, the other way</p>
      <ol style={{ listStyle: "none", display: "grid" }}>
        {rows.map((r, i) => (
          <li key={r.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr", columnGap: 10 }}>
            <span aria-hidden="true" style={{ display: "grid", placeItems: "center", height: 26 }}>
              <span
                style={{
                  width: r.hot ? 16 : 11,
                  height: r.hot ? 16 : 11,
                  borderRadius: "50%",
                  background: r.hot ? HOTSPOT_COLOR : "var(--surface)",
                  border: `2.5px solid ${r.hot ? "#fff" : HOTSPOT_COLOR}`,
                  boxShadow: r.hot ? `0 0 0 4px color-mix(in srgb, ${HOTSPOT_COLOR} 30%, transparent)` : undefined,
                }}
              />
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8, minHeight: 26, minWidth: 0 }}>
              <span style={{ fontWeight: r.hot ? 800 : 700, fontSize: r.hot ? 16 : 14.5, color: r.hot ? HOTSPOT_COLOR : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.label}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.note}</span>
            </span>
            {i < rows.length - 1 ? (
              <>
                <span aria-hidden="true" style={{ display: "flex", justifyContent: "center", minHeight: 24 }}>
                  <span style={{ width: 0, borderLeft: `2.5px dashed color-mix(in srgb, ${HOTSPOT_COLOR} 70%, transparent)` }} />
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{r.gap}</span>
              </>
            ) : null}
          </li>
        ))}
      </ol>

      <div style={{ display: "grid", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 650 }}>
          <TeamIcon size={18} weight={2.2} style={{ color: HOTSPOT_COLOR, flexShrink: 0 }} />
          {hotspot.sharedWith > 0 ? (
            <span>
              <span className="num">{hotspot.sharedWith}</span> other {hotspot.sharedWith === 1 ? "rider has" : "riders have"} this hotspot
            </span>
          ) : (
            <span>Be the first here. Anyone on any team can meet you.</span>
          )}
        </p>
        {hotspot.sharedInterests.length ? (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 2 }}>You both like</span>
            {hotspot.sharedInterests.map((t) => (
              <span
                key={t}
                style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: 12.5, fontWeight: 700, background: "var(--surface-3)", border: "1px solid var(--glass-border)" }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const stops = (n: number) => `${n} ${n === 1 ? "stop" : "stops"}`;

// ---------- meet / bump ----------

type Phase = "idle" | "locating" | "waiting" | "pairing" | "matched" | "expired";
interface Fix {
  lat: number;
  lng: number;
  accuracy?: number;
  at: number;
}

function MeetPanel({ hotspot, riderId, onEarned, now }: HotspotGameProps & { now: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MeetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  // Each bump/pair starts a new run; stale responses and timers from older runs are ignored.
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fix = useRef<Fix | null>(null);
  const station = STATION_BY_ID.get(hotspot.stationId)?.name ?? hotspot.name;
  const who = riderId ?? (USE_MOCKS ? hotspotsFixture.riderId : null);

  useEffect(() => {
    return () => {
      run.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function locate(): Promise<Fix> {
    if (USE_MOCKS) return { lat: hotspot.lat, lng: hotspot.lng, at: Date.now() };
    const cached = fix.current;
    if (cached && Date.now() - cached.at < FIX_MAX_AGE) return cached;
    if (!("geolocation" in navigator)) throw new HotspotError("This device can't share its location.", null, 0);
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const f = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: Date.now() };
          fix.current = f;
          resolve(f);
        },
        () => reject(new HotspotError("Couldn't get your location. Allow location access and try again.", null, 0)),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
      );
    });
  }

  async function send(id: number, code?: string) {
    if (!who) return;
    try {
      const f = await locate();
      if (id !== run.current) return;
      const res = await meetHotspot({ riderId: who, hotspotId: hotspot.id, lat: f.lat, lng: f.lng, accuracy: f.accuracy, ...(code ? { code } : {}) });
      if (id !== run.current) return;
      setResult(res);
      setPhase(res.status);
      if (res.status === "waiting") {
        timer.current = setTimeout(() => send(id), POLL_MS);
      } else if (res.status === "matched") {
        setPartnerCode("");
        if (res.pointsAwarded > 0) onEarned();
      }
    } catch (err) {
      if (id !== run.current) return;
      const message = err instanceof Error ? err.message : "Couldn't reach the hotspot. Try again.";
      if (code && err instanceof HotspotError && (err.code === "code_not_found" || err.code === "bad_code")) {
        setCodeError(message);
        // A bad code doesn't cancel an open bump: keep waiting if we were.
        setPhase(result?.status === "waiting" ? "waiting" : "idle");
        if (result?.status === "waiting") timer.current = setTimeout(() => send(id), POLL_MS);
        return;
      }
      setError(message);
      setPhase("idle");
    }
  }

  function start(code?: string) {
    if (timer.current) clearTimeout(timer.current);
    run.current += 1;
    setError(null);
    setCodeError(null);
    setPhase(code ? "pairing" : result?.status === "waiting" ? "waiting" : "locating");
    void send(run.current, code);
  }

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    run.current += 1;
    setPhase("idle");
    setResult(null);
  }

  if (!who) {
    return (
      <section style={panel}>
        <p style={eyebrow}>Meet up</p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Join from the Ride tab first, then come back to bump.</p>
      </section>
    );
  }

  if (phase === "matched" && result) {
    return <Matched result={result} station={station} onAgain={stop} />;
  }

  const waiting = phase === "waiting" || (phase === "pairing" && result?.status === "waiting");
  const code = waiting && result ? result.code : null;
  const codeLeft = result ? Math.max(0, Math.ceil((Date.parse(result.expiresAt) - now) / 1000)) : 0;
  const busy = phase === "locating" || phase === "pairing";

  return (
    <section aria-label="Meet up" style={panel}>
      <div>
        <p style={eyebrow}>Meet up</p>
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 4 }}>
          Find another rider at {station}. Tap Bump together (within 10 seconds), or one of you types the other&apos;s code.
        </p>
      </div>

      <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
        <p style={{ ...eyebrow, fontSize: 10.5 }}>Your code</p>
        <div role="group" aria-label={code ? `Your code ${code.split("").join(" ")}` : "No code yet"} style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="num"
              style={{
                display: "grid",
                placeItems: "center",
                width: 52,
                height: 64,
                borderRadius: 14,
                background: code ? "var(--surface)" : "transparent",
                border: `1.5px ${code ? "solid" : "dashed"} ${code ? HOTSPOT_COLOR : "var(--muted)"}`,
                fontFamily: "var(--font-mono)",
                fontSize: 34,
                fontWeight: 800,
                color: code ? "var(--ink)" : "var(--muted)",
              }}
            >
              {code ? code[i] : "–"}
            </span>
          ))}
        </div>
        <p role="status" style={{ fontSize: 12.5, color: waiting ? HOTSPOT_COLOR : "var(--muted)", fontWeight: 650, minHeight: 18, textAlign: "center" }}>
          {waiting ? (
            <>
              Waiting for a bump · code good for <span className="num">{codeLeft}s</span>
            </>
          ) : phase === "expired" ? (
            "No one bumped in time. Tap Bump to try again."
          ) : (
            "Tap Bump to get a code"
          )}
        </p>
      </div>

      <BumpButton waiting={waiting} busy={phase === "locating"} onBump={() => start()} />
      {waiting ? (
        <button type="button" onClick={stop} style={{ ...linkButton, justifySelf: "center" }}>
          Stop waiting
        </button>
      ) : null}

      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "var(--glow-red)", lineHeight: 1.4 }}>
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (partnerCode.length === 4 && !busy) start(partnerCode);
        }}
        style={{ display: "grid", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}
      >
        <label htmlFor="hotspot-partner-code" style={{ ...eyebrow, fontSize: 10.5 }}>
          Or type their code
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="hotspot-partner-code"
            value={partnerCode}
            onChange={(e) => {
              setPartnerCode(e.target.value.replace(/\D/g, "").slice(0, 4));
              setCodeError(null);
            }}
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            size={4}
            autoComplete="off"
            placeholder="0000"
            aria-describedby={codeError ? "hotspot-code-error" : undefined}
            aria-invalid={codeError ? true : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              width: "100%",
              height: 52,
              padding: "0 14px",
              borderRadius: 16,
              border: `1.5px solid ${codeError ? "var(--glow-red)" : "var(--border)"}`,
              background: "var(--surface)",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "0.4em",
              textAlign: "center",
            }}
          />
          <button
            type="submit"
            disabled={partnerCode.length !== 4 || busy}
            style={{ ...secondaryButton, minHeight: 52, padding: "0 20px", opacity: partnerCode.length !== 4 || busy ? 0.5 : 1 }}
          >
            {phase === "pairing" ? "Pairing…" : "Pair"}
          </button>
        </div>
        {codeError ? (
          <p id="hotspot-code-error" role="alert" style={{ fontSize: 13, color: "var(--glow-red)" }}>
            {codeError}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function BumpButton({ waiting, busy, onBump }: { waiting: boolean; busy: boolean; onBump: () => void }) {
  return (
    <button
      type="button"
      onClick={onBump}
      disabled={busy}
      aria-label={waiting ? "Bump again" : "Bump phones"}
      style={{
        ...primaryButton,
        position: "relative",
        overflow: "hidden",
        minHeight: 64,
        fontSize: 19,
        gap: 10,
        fontFamily: "var(--font-display)",
        background: waiting ? HOTSPOT_COLOR : "var(--accent)",
        color: waiting ? "#fff" : "var(--accent-ink)",
        opacity: busy ? 0.75 : 1,
        boxShadow: `0 10px 30px color-mix(in srgb, ${waiting ? HOTSPOT_COLOR : "var(--accent)"} 28%, transparent)`,
      }}
    >
      {waiting ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 64,
            height: 64,
            marginLeft: -32,
            marginTop: -32,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.55)",
            animation: "pulse-ring 1.4s var(--ease-out) infinite",
          }}
        />
      ) : null}
      <BumpIcon size={26} weight={2.3} />
      {busy ? "Finding you…" : waiting ? "Bumping… tap together" : "Bump"}
    </button>
  );
}

function Matched({ result, station, onAgain }: { result: MeetResponse; station: string; onAgain: () => void }) {
  const fresh = result.pointsAwarded > 0;
  const team: TeamRouteId | undefined = result.partner?.homeTeamRouteId;
  return (
    <section
      aria-label="Met up"
      role="status"
      style={{
        ...panel,
        justifyItems: "center",
        textAlign: "center",
        background: fresh
          ? `radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, ${HOTSPOT_COLOR} 34%, transparent), var(--surface-2) 70%)`
          : "var(--surface-2)",
        border: `1px solid color-mix(in srgb, ${fresh ? HOTSPOT_COLOR : "var(--border)"} 50%, transparent)`,
        animation: "tier-up 320ms var(--ease-out)",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: fresh ? "var(--accent)" : "var(--surface-3)", color: fresh ? "var(--accent-ink)" : "var(--ink)" }}>
        {fresh ? <BumpIcon size={30} weight={2.4} /> : <CheckIcon size={28} weight={2.6} />}
      </span>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>
        {fresh ? "Bumped!" : "Already met today"}
      </p>
      {fresh ? (
        <p className="num" style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 800, lineHeight: 0.95, color: "var(--accent)" }}>
          +{result.pointsAwarded}
        </p>
      ) : null}
      {result.partner ? (
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, flexWrap: "wrap", justifyContent: "center" }}>
          You met {result.partner.displayName}
          {team ? <LineChip teamRouteId={team} size="sm" /> : null}
        </p>
      ) : null}
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45 }}>{result.message}</p>
      <p style={{ fontSize: 12, color: "var(--muted)" }}>
        {result.multiplier}x hotspot bonus at {station}. One bonus per pair per day.
      </p>
      <button type="button" onClick={onAgain} style={{ ...secondaryButton, minHeight: 48, marginTop: 4 }}>
        Meet someone else
      </button>
    </section>
  );
}

// ---------- bits ----------

const panel: React.CSSProperties = { padding: 16, borderRadius: 22, background: "var(--surface-2)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 };

const linkButton: React.CSSProperties = {
  minHeight: 44,
  padding: "0 12px",
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontSize: 13.5,
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

/** "18h 20m", "12m 5s", "40s". */
export function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** Ticking clock for countdowns. */
function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
