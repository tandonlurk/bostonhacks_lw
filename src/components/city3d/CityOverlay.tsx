"use client";

import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CloseIcon, TeamIcon } from "@/components/icons";
import { HomeViewIcon, OrbitIcon } from "./icons";
import type { TeamStat } from "./model";
import { TEAM_HEX } from "./palette";
import styles from "./city3d.module.css";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");
export const fmtCompact = (n: number) => compact.format(n);
export const fmtFull = (n: number) => full.format(n);

const TOP = "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 12px)";
/** Bottom edge of the leaderboard dock (sits just above the floating nav). */
export const DOCK_BOTTOM = "calc(var(--nav-height) + var(--nav-gap) + env(safe-area-inset-bottom, 0px) + 12px)";

export function CityHeader({ total, riders, loading, live }: { total: number; riders: number; loading: boolean; live: boolean }) {
  return (
    <header
      data-ui
      className="glass"
      style={{
        position: "absolute",
        top: TOP,
        left: 12,
        right: 12,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px 10px 16px",
        borderRadius: 22,
        boxShadow: "var(--shadow-float)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>Boston</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)" }}>
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
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", marginTop: 6 }}>CITY POINTS</div>
      </div>
    </header>
  );
}

export function CityControls({ onRotate, onHome }: { onRotate: () => void; onHome: () => void }) {
  return (
    <div
      data-ui
      style={{
        position: "absolute",
        top: `calc(${TOP} + 84px)`,
        right: 12,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button type="button" className={`glass ${styles.fab}`} onClick={onRotate} aria-label="Rotate city view 90 degrees">
        <OrbitIcon size={22} />
      </button>
      <button type="button" className={`glass ${styles.fab}`} onClick={onHome} aria-label="Reset camera">
        <HomeViewIcon size={22} />
      </button>
    </div>
  );
}

export function TeamCard({
  stat,
  leader,
  isMine,
  onClose,
}: {
  stat: TeamStat;
  leader: TeamStat | null;
  isMine: boolean;
  onClose: () => void;
}) {
  const hex = TEAM_HEX[stat.team];
  const gap = leader && leader.team !== stat.team ? leader.points - stat.points : 0;
  return (
    <section
      data-ui
      key={stat.team}
      className={`glass ${styles.card}`}
      aria-label={`${TEAMS[stat.team].name} details`}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: `calc(${DOCK_BOTTOM} + 74px)`,
        zIndex: 6,
        borderRadius: 22,
        padding: "14px 10px 14px 16px",
        boxShadow: `var(--shadow-float), inset 0 0 0 1px ${hex.glow}33`,
        overflow: "hidden",
      }}
    >
      <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: hex.glow }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: hex.glow, lineHeight: 1.1 }}>{TEAMS[stat.team].name}</h2>
            <span className="num" style={{ fontSize: 13, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "var(--surface-3)" }}>
              #{stat.rank}
            </span>
            {isMine ? (
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, background: "var(--accent)", color: "var(--accent-ink)" }}>
                YOUR TEAM
              </span>
            ) : null}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{stat.districtName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team card"
          style={{ display: "grid", placeItems: "center", width: 44, height: 44, marginTop: -6, borderRadius: "50%", border: "none", background: "transparent", flex: "none" }}
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 10 }}>
        <div>
          <div className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {fmtFull(stat.points)}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: 4 }}>POINTS</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", gap: 5 }}>
            <TeamIcon size={16} /> {stat.riders}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: 4 }}>RIDERS</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 13, fontWeight: 700, paddingRight: 6 }}>
          {stat.points === 0 ? (
            <span style={{ color: "var(--muted)" }}>Ride to lay the first floor</span>
          ) : stat.rank === 1 ? (
            <span style={{ color: "var(--accent)" }}>Tallest skyline in Boston</span>
          ) : (
            <span style={{ color: "var(--muted)" }}>
              <span className="num" style={{ color: "var(--ink)" }}>
                {fmtFull(gap)}
              </span>{" "}
              pts to #1
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export function teamFromId(stats: TeamStat[], id: TeamRouteId | null): TeamStat | null {
  return id ? (stats.find((s) => s.team === id) ?? null) : null;
}
