"use client";

// Playable placeholder mini-game: 3 quick MBTA trivia questions against a countdown. Local only; the reward shown at
// the end is a preview and nothing is sent to the points API (that lands with B's /api/hunts/map work, issue #93).
import { useEffect, useMemo, useState } from "react";
import { CheckIcon, CloseIcon, StarIcon } from "@/components/icons";
import { hash, type StationGame } from "./placeholderGames";
import { eyebrow, primaryButton, secondaryButton } from "./styles";

interface Question {
  q: string;
  options: string[];
  answer: string;
}

const BANK: Question[] = [
  { q: "Which line runs out to Wonderland?", options: ["Blue", "Orange", "Red", "Green"], answer: "Blue" },
  { q: "The Tremont Street Subway, now part of the Green Line, opened as America's first subway in which year?", options: ["1897", "1912", "1868", "1924"], answer: "1897" },
  { q: "Where do the Red and Orange lines meet?", options: ["Downtown Crossing", "Park Street", "State", "Haymarket"], answer: "Downtown Crossing" },
  { q: "How many Green Line branches are there?", options: ["4", "3", "5", "2"], answer: "4" },
  { q: "Which station is the southern end of the Orange Line?", options: ["Forest Hills", "Ashmont", "Jackson Square", "Mattapan"], answer: "Forest Hills" },
  { q: "The Red Line splits at JFK/UMass. Ashmont is one branch. What's the other?", options: ["Braintree", "Quincy Adams", "Mattapan", "Wollaston"], answer: "Braintree" },
  { q: "The CharlieCard is named for the rider stuck on the MTA in a 1959 hit by…", options: ["The Kingston Trio", "The Beatles", "Aerosmith", "Dropkick Murphys"], answer: "The Kingston Trio" },
  { q: "Which Green Line branch ends at Heath Street?", options: ["E", "B", "C", "D"], answer: "E" },
  { q: "Which line has a stop called Aquarium?", options: ["Blue", "Orange", "Green", "Silver"], answer: "Blue" },
  { q: "Which Silver Line route runs straight to the Logan Airport terminals?", options: ["SL1", "SL4", "SL5", "SL3"], answer: "SL1" },
];

const SECONDS = 12;
const REVEAL_MS = 1300;

function pickRound(seed: number): Question[] {
  const start = seed % BANK.length;
  // Strides coprime with the bank size so every round has 3 distinct questions.
  const stride = [1, 3, 7, 9][seed % 4];
  const picked: Question[] = [];
  for (let i = 0; picked.length < 3 && i < BANK.length * 2; i++) {
    const q = BANK[(start + i * stride) % BANK.length];
    if (!picked.includes(q)) picked.push(q);
  }
  return picked.map((q, i) => {
    // Deterministic shuffle so the right answer isn't always first.
    const order = q.options.map((o, j) => ({ o, w: hash(`${seed}:${i}:${o}:${j}`) })).sort((a, b) => a.w - b.w);
    return { ...q, options: order.map((x) => x.o) };
  });
}

type Phase = "ready" | "question" | "reveal" | "done";

export function TriviaGame({ stopId, game, onExit }: { stopId: string; game: StationGame; onExit: () => void }) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => pickRound(hash(stopId) + round * 7), [stopId, round]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);

  const q = questions[idx];
  const left = Math.max(0, deadline - now) / 1000;

  // Countdown tick.
  useEffect(() => {
    if (phase !== "question") return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) {
        setPicked(null);
        setPhase("reveal");
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, deadline]);

  // Auto-advance after the reveal.
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => {
      if (idx >= questions.length - 1) setPhase("done");
      else {
        setIdx(idx + 1);
        setPicked(null);
        const n = Date.now();
        setNow(n);
        setDeadline(n + SECONDS * 1000);
        setPhase("question");
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, idx, questions.length]);

  function start(nextRound = round) {
    setRound(nextRound);
    setIdx(0);
    setScore(0);
    setPicked(null);
    const n = Date.now();
    setNow(n);
    setDeadline(n + SECONDS * 1000);
    setPhase("question");
  }

  function choose(option: string) {
    if (phase !== "question") return;
    setPicked(option);
    if (option === q.answer) setScore((s) => s + 1);
    setPhase("reveal");
  }

  if (phase === "ready") {
    return (
      <div style={{ display: "grid", gap: 16, padding: "8px 0 4px" }}>
        <div style={{ padding: 18, borderRadius: 22, background: "linear-gradient(140deg, rgba(124,196,255,0.18), rgba(228,255,58,0.08))", border: "1px solid var(--glass-border)" }}>
          <p style={eyebrow}>{game.title}</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>
            3 questions.
            <br />
            {SECONDS} seconds each.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8 }}>
            Faster than the train, probably. Preview reward up to <strong style={{ color: "var(--accent)" }}>+{game.rewardPoints} pts</strong>.
          </p>
        </div>
        <button type="button" onClick={() => start()} style={{ ...primaryButton, minHeight: 54, fontSize: 17 }}>
          Start round
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const pts = Math.round((game.rewardPoints * score) / questions.length);
    const tokens = score === questions.length ? game.rewardTokens : score > 0 ? 1 : 0;
    const line = score === 3 ? "Flawless. Conductor energy." : score === 2 ? "So close. One more lap?" : score === 1 ? "On the board. Keep riding." : "Rough commute. Run it back.";
    return (
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center", padding: "8px 0 4px" }}>
        <div style={{ position: "relative", width: 132, height: 132, display: "grid", placeItems: "center" }}>
          <span aria-hidden="true" style={{ position: "absolute", inset: -12, color: "var(--accent)", animation: "spin-slow 14s linear infinite" }}>
            <Burst />
          </span>
          <span className="num" style={{ fontSize: 56, fontWeight: 800, animation: "tier-up 420ms var(--ease-out)" }}>
            {score}/{questions.length}
          </span>
        </div>
        <div aria-hidden="true" style={{ display: "flex", gap: 6 }}>
          {questions.map((_, i) => (
            <span key={i} style={{ color: i < score ? "var(--accent)" : "var(--surface-3)", animation: `tier-up ${300 + i * 140}ms var(--ease-out)` }}>
              <StarIcon size={30} weight={2.2} fill={i < score ? "currentColor" : "none"} />
            </span>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800 }}>{line}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 16, background: "var(--surface-2)", border: "1px dashed var(--border)" }}>
          <span className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>+{pts} pts</span>
          <span style={{ color: "var(--muted)" }}>·</span>
          <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>+{tokens} tokens</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px" }}>PREVIEW</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8 }}>Trivia rewards start banking once mini-games go live.</p>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button type="button" onClick={onExit} style={{ ...secondaryButton, flex: 1 }}>
            Other games
          </button>
          <button type="button" onClick={() => start(round + 1)} style={{ ...primaryButton, flex: 1 }}>
            Play again
          </button>
        </div>
      </div>
    );
  }

  const frac = phase === "question" ? left / SECONDS : 0;
  const urgent = phase === "question" && left <= 4;
  return (
    <div style={{ display: "grid", gap: 14, padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, display: "flex", gap: 6 }} aria-label={`Question ${idx + 1} of ${questions.length}`}>
          {questions.map((_, i) => (
            <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < idx ? "var(--accent)" : i === idx ? "var(--ink)" : "var(--surface-3)" }} />
          ))}
        </div>
        <Countdown frac={frac} seconds={Math.ceil(left)} urgent={urgent} />
      </div>
      <p key={idx} style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 750, lineHeight: 1.25, minHeight: 78, animation: "fade-in 220ms" }}>
        {q.q}
      </p>
      <div style={{ display: "grid", gap: 8 }} role="group" aria-label="Answers">
        {q.options.map((o) => {
          const revealed = phase === "reveal";
          const right = revealed && o === q.answer;
          const wrong = revealed && o === picked && o !== q.answer;
          return (
            <button
              key={o}
              type="button"
              onClick={() => choose(o)}
              disabled={revealed}
              aria-pressed={picked === o}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 52,
                padding: "0 16px",
                borderRadius: 16,
                textAlign: "left",
                fontSize: 16,
                fontWeight: 700,
                border: `1.5px solid ${right ? "var(--glow-green)" : wrong ? "var(--glow-red)" : "var(--border)"}`,
                background: right ? "rgba(31,209,122,0.16)" : wrong ? "rgba(255,77,61,0.14)" : "var(--surface-2)",
                color: "var(--ink)",
                opacity: revealed && !right && !wrong ? 0.5 : 1,
                animation: right ? "tier-up 260ms var(--ease-out)" : undefined,
                transition: "background 160ms, border-color 160ms, opacity 160ms",
              }}
            >
              <span style={{ flex: 1 }}>{o}</span>
              {right ? <CheckIcon size={20} weight={2.6} style={{ color: "var(--glow-green)" }} /> : null}
              {wrong ? <CloseIcon size={18} weight={2.6} style={{ color: "var(--glow-red)" }} /> : null}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" style={{ minHeight: 20, fontSize: 13.5, fontWeight: 700, color: phase !== "reveal" ? "var(--muted)" : picked === q.answer ? "var(--glow-green)" : "var(--glow-red)" }}>
        {phase !== "reveal" ? "Tap an answer" : picked === q.answer ? "Correct!" : picked == null ? `Time! It's ${q.answer}.` : `Nope, it's ${q.answer}.`}
      </p>
    </div>
  );
}

/** Loose hand-drawn rays around the score, leaving the middle clear for the number. */
function Burst() {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.08 : -0.05);
    const r0 = i % 2 ? 62 : 58;
    const r1 = i % 2 ? 72 : 76;
    const bend = i % 3 === 0 ? 2.5 : -1.5;
    const x0 = 78 + Math.cos(a) * r0;
    const y0 = 78 + Math.sin(a) * r0;
    const x1 = 78 + Math.cos(a) * r1;
    const y1 = 78 + Math.sin(a) * r1;
    const mx = (x0 + x1) / 2 - Math.sin(a) * bend;
    const my = (y0 + y1) / 2 + Math.cos(a) * bend;
    return `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  });
  return (
    <svg width="156" height="156" viewBox="0 0 156 156" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d={rays.join("")} />
    </svg>
  );
}

function Countdown({ frac, seconds, urgent }: { frac: number; seconds: number; urgent: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div role="timer" aria-label={`${seconds} seconds left`} style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
      <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={urgent ? "var(--hot)" : "var(--accent)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 23 23)"
          style={{ transition: "stroke-dashoffset 100ms linear, stroke 200ms" }}
        />
      </svg>
      <span className="num" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800, color: urgent ? "var(--hot)" : "var(--ink)" }}>
        {seconds}
      </span>
    </div>
  );
}
