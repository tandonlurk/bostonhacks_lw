"use client";

import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CloseIcon, TeamIcon } from "@/components/icons";
import { PaperBadge, PaperButton, PaperCard, Stamp, Tape } from "@/components/paper/Paper";
import { HomeViewIcon, OrbitIcon } from "./icons";
import { TIER_NAMES, type TeamStat } from "./model";
import { TEAM_HEX, TEAM_ON, TEAM_SHORT } from "./palette";
import styles from "./city3d.module.css";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");
export const fmtCompact = (n: number) => compact.format(n);
export const fmtFull = (n: number) => full.format(n);

const TOP = "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 12px)";
/** Bottom edge of the leaderboard dock (sits just above the floating nav). */
export const DOCK_BOTTOM = "calc(var(--nav-height) + var(--nav-gap) + env(safe-area-inset-bottom, 0px) + 12px)";

/** Team swatch: exact line color with a short code, so teams never read by color alone. */
export function TeamSwatch({ team }: { team: TeamRouteId }) {
  return (
    <span aria-hidden="true" className={styles.swatch} style={{ background: TEAM_HEX[team].base, color: TEAM_ON[team] }}>
      {TEAM_SHORT[team]}
    </span>
  );
}

/** Five folded-house pips filled up to the tier, plus the tier in words for screen readers. */
export function TierPips({ tier }: { tier: number }) {
  return (
    <span className={styles.pips} role="img" aria-label={`Tier ${tier} of 5, ${TIER_NAMES[tier]}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`${styles.pip} ${i <= tier ? styles.pipOn : ""}`} />
      ))}
    </span>
  );
}

export function CityHeader({ total, riders, loading, live }: { total: number; riders: number; loading: boolean; live: boolean }) {
  return (
    <PaperCard as="header" data-ui className={styles.header} style={{ position: "absolute", top: TOP, boxShadow: "var(--shadow-float)" }}>
      <Tape rotate={-4} style={{ left: 28, marginLeft: 0, top: -9, width: 54 }} />
      <div style={{ minWidth: 0 }}>
        <h1 className={styles.title}>Boston</h1>
        <div className={styles.meta}>
          {live ? <span className={styles.livePulse} aria-hidden="true" /> : null}
          <span style={{ color: live ? "var(--hot)" : "var(--muted)" }}>{loading ? "LOADING" : live ? "LIVE" : "OFFLINE"}</span>
          <span aria-hidden="true">·</span>
          <span>{riders > 0 ? `${fmtFull(riders)} RIDERS` : "5 LINES"}</span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="num" style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }} aria-label={`${fmtFull(total)} city points`}>
          {fmtFull(total)}
        </div>
        <div className={styles.eyebrowSmall}>CITY POINTS</div>
      </div>
    </PaperCard>
  );
}

export function CityControls({ onRotate, onHome }: { onRotate: () => void; onHome: () => void }) {
  return (
    <div data-ui style={{ position: "absolute", top: `calc(${TOP} + 84px)`, right: 12, zIndex: 5, display: "flex", flexDirection: "column", gap: 10 }}>
      <PaperButton className={styles.fab} onClick={onRotate} aria-label="Turn the city a quarter turn">
        <OrbitIcon size={22} />
      </PaperButton>
      <PaperButton className={styles.fab} onClick={onHome} aria-label="Reset camera">
        <HomeViewIcon size={22} />
      </PaperButton>
    </div>
  );
}

export function TeamCard({ stat, tier, leader, isMine, onClose }: { stat: TeamStat; tier: number; leader: TeamStat | null; isMine: boolean; onClose: () => void }) {
  const hex = TEAM_HEX[stat.team];
  const gap = leader && leader.team !== stat.team ? leader.points - stat.points : 0;
  return (
    <PaperCard
      as="section"
      data-ui
      key={stat.team}
      className={styles.card}
      aria-label={`${TEAMS[stat.team].name} details`}
      style={{ position: "absolute", left: 12, right: 12, bottom: `calc(${DOCK_BOTTOM} + 74px)`, zIndex: 6, padding: "14px 10px 14px 20px", boxShadow: "var(--shadow-float)" }}
    >
      <div aria-hidden="true" className={styles.teamFlap} style={{ background: hex.base }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 22, fontWeight: 750, color: hex.ink, lineHeight: 1.1 }}>{TEAMS[stat.team].name}</h2>
            <Stamp color={stat.rank === 1 && stat.points > 0 ? "var(--gold-ink)" : "var(--brick)"} rotate={-5}>
              No. {stat.rank}
            </Stamp>
            {isMine ? (
              <PaperBadge bg="var(--accent)" ink="var(--accent-ink)">
                Your team
              </PaperBadge>
            ) : null}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{stat.districtName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team card"
          style={{ display: "grid", placeItems: "center", width: 44, height: 44, marginTop: -6, marginRight: 8, borderRadius: "50%", border: "none", background: "transparent", color: "var(--ink)", flex: "none" }}
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 10, flexWrap: "wrap" }}>
        <div>
          <div className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {fmtFull(stat.points)}
          </div>
          <div className={styles.eyebrowSmall}>POINTS</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", gap: 5 }}>
            <TeamIcon size={16} /> {stat.riders}
          </div>
          <div className={styles.eyebrowSmall}>RIDERS</div>
        </div>
        <div>
          <div style={{ height: 20, display: "flex", alignItems: "center" }}>
            <TierPips tier={tier} />
          </div>
          <div className={styles.eyebrowSmall}>
            TIER {tier} · {TIER_NAMES[tier].toUpperCase()}
          </div>
        </div>
      </div>
      <p style={{ marginTop: 10, fontSize: 13, fontWeight: 650 }}>
        {stat.points === 0 ? (
          <span style={{ color: "var(--muted)" }}>Ride to fold the first floor.</span>
        ) : stat.rank === 1 ? (
          <span style={{ color: "var(--accent)" }}>Tallest skyline in Boston.</span>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            <span className="num" style={{ color: "var(--ink)" }}>
              {fmtFull(gap)}
            </span>{" "}
            pts to No. 1
          </span>
        )}
      </p>
    </PaperCard>
  );
}

export function teamFromId(stats: TeamStat[], id: TeamRouteId | null): TeamStat | null {
  return id ? (stats.find((s) => s.team === id) ?? null) : null;
}
