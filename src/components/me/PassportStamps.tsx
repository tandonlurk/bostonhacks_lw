"use client";

// Passport stamp collection. Every stamp is derived from data the rider already has: their home line,
// token ledger (rides, hunts, perks), streak, and landmark claims from /api/landmarks. Anything not yet
// earned renders as a faint dashed outline marked "Locked"; nothing here is invented.
import type { ReactNode } from "react";
import type { Landmark, TokenLedgerEntry } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { Fenway, PaperElm, PaperFlag, PaperT, StationArt, SwanBoat, TripleDecker } from "@/components/paper/origami";
import { countByKind } from "./activity";
import { SectionTitle } from "./SectionTitle";
import { glowVar } from "./team";
import s from "./me.module.css";

interface StampDef {
  id: string;
  label: string;
  sub: string;
  earned: boolean;
  /** Ink color for the inked stamp. */
  ink: string;
  art: ReactNode;
}

const ROT = [-7, 5, -3, 8, -5, 3, -8, 6, -2];

interface PassportStampsProps {
  ledger: TokenLedgerEntry[];
  landmarks: Landmark[];
  team: TeamRouteId;
  streakDays: number;
}

export function PassportStamps({ ledger, landmarks, team, streakDays }: PassportStampsProps) {
  const counts = countByKind(ledger);

  const stamps: StampDef[] = [
    {
      id: "home",
      label: TEAMS[team].name,
      sub: "Home line",
      earned: true,
      ink: glowVar(team),
      art: <PaperT height={34} tint="#2a241d" />,
    },
    {
      id: "ride",
      label: "First ride",
      sub: counts.ride ? `${counts.ride} credited` : "Ride to unlock",
      earned: counts.ride > 0,
      ink: "var(--accent)",
      art: <TripleDecker height={36} />,
    },
    {
      id: "hunt",
      label: "Hunt cleared",
      sub: counts.hunt ? `${counts.hunt} cleared` : "Clear a delay hunt",
      earned: counts.hunt > 0,
      ink: "var(--glow-red)",
      art: <PaperFlag height={34} />,
    },
    {
      id: "perk",
      label: "Perk redeemed",
      sub: counts.perk ? `${counts.perk} redeemed` : "Spend CitiTokens",
      earned: counts.perk > 0,
      ink: "var(--gold-ink)",
      art: <SwanBoat height={26} />,
    },
    {
      id: "streak3",
      label: "3-day streak",
      sub: streakDays >= 3 ? `${streakDays} days` : `${streakDays} of 3 days`,
      earned: streakDays >= 3,
      ink: "var(--glow-orange)",
      art: <PaperElm height={34} />,
    },
    {
      id: "streak7",
      label: "7-day streak",
      sub: streakDays >= 7 ? `${streakDays} days` : `${streakDays} of 7 days`,
      earned: streakDays >= 7,
      ink: "var(--harbor)",
      art: <Fenway height={28} />,
    },
    ...landmarks.map<StampDef>((l) => ({
      id: `lm-${l.id}`,
      label: l.name,
      sub: l.claimed ? `+${l.bonusPoints} pts` : "Claim to unlock",
      earned: l.claimed,
      ink: "var(--brick)",
      art: <StationArt name={l.name} height={34} />,
    })),
  ];

  const earned = stamps.filter((x) => x.earned).length;

  return (
    <section aria-labelledby="me-stamps" style={{ padding: "0 var(--space-4)" }}>
      <SectionTitle
        id="me-stamps"
        title="Stamps"
        action={
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            <span className="num" style={{ fontWeight: 800, color: "var(--ink)", fontSize: 15 }}>
              {earned}
            </span>{" "}
            of {stamps.length} collected
          </span>
        }
      />
      <div className={s.passport} style={{ padding: "18px 12px 16px" }}>
        <ul className={s.stampGrid}>
          {stamps.map((st, i) => {
            const rot = st.earned ? ROT[i % ROT.length] : 0;
            return (
              <li key={st.id} className={s.stampItem}>
                <span className="visually-hidden">{`${st.label}: ${st.earned ? "collected" : "locked"}. ${st.sub}.`}</span>
                <span
                  className={`${s.stampDisc} ${st.earned ? s.inked : ""}`}
                  data-locked={!st.earned}
                  aria-hidden="true"
                  style={{ ["--ink-c" as string]: st.ink, ["--r" as string]: `${rot}deg`, transform: `rotate(${rot}deg)`, animationDelay: `${i * 40}ms` }}
                >
                  {st.art}
                </span>
                <span aria-hidden="true" className={s.stampLabel}>
                  {st.label}
                </span>
                <span aria-hidden="true" className={s.stampSub}>
                  {st.earned ? st.sub : `Locked · ${st.sub}`}
                </span>
              </li>
            );
          })}
        </ul>
        {!landmarks.length ? (
          <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
            Landmark stamps appear here as the city opens them up.
          </p>
        ) : null}
      </div>
    </section>
  );
}
