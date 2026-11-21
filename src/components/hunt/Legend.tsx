"use client";

import { TEAMS, TEAM_ROUTE_IDS } from "@/contracts/routes";
import { GAME_META, GAME_ORDER, HEAT, type HeatLevel } from "./gameMeta";
import { GLOW } from "./mapModel";

const HEAT_ORDER: HeatLevel[] = ["ok", "slow", "crawl"];

/** Map key: line colors, heat buckets, game symbols and delay styling. */
export function Legend({ heatAvailable }: { heatAvailable: boolean }) {
  return (
    <section
      id="hunt-legend"
      aria-label="Map legend"
      className="glass"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 84px)",
        left: 12,
        right: 12,
        zIndex: 6,
        maxHeight: "calc(100dvh - var(--banner-space) - 84px - var(--nav-clearance) - 24px)",
        overflowY: "auto",
        borderRadius: 22,
        padding: 16,
        boxShadow: "var(--shadow-float)",
        animation: "fade-in 180ms var(--ease-out)",
        display: "grid",
        gap: 14,
      }}
    >
      <Group title="Lines">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
          {TEAM_ROUTE_IDS.map((t) => (
            <Row key={t}>
              <span aria-hidden="true" style={{ width: 22, height: 6, borderRadius: 3, background: GLOW[t], flexShrink: 0 }} />
              {TEAMS[t].name}
            </Row>
          ))}
          <Row>
            <svg aria-hidden="true" width="22" height="8" style={{ flexShrink: 0 }}>
              <line x1="2" y1="4" x2="20" y2="4" stroke="var(--hot)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5" />
            </svg>
            Delayed line
          </Row>
        </div>
      </Group>

      <Group title={heatAvailable ? "Station speed, last 2 hours" : "Station speed (no history yet)"}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
          {HEAT_ORDER.map((h) => (
            <Row key={h}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: HEAT[h].color, border: "2px solid #0b0d12", boxShadow: "0 0 0 1px rgba(255,255,255,0.3)" }} />
              <span>
                {HEAT[h].label} <span style={{ color: "var(--muted)" }}>{HEAT[h].range}</span>
              </span>
            </Row>
          ))}
          <Row>
            <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "2px solid #0b0d12" }} />
            No data
          </Row>
          <Row>
            <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", border: "2px solid #0b0d12", boxShadow: "0 0 0 1.5px #fff" }} />
            Transfer
          </Row>
        </div>
      </Group>

      <Group title="Mini-games">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
          {GAME_ORDER.map((k) => {
            const { Icon, color, label } = GAME_META[k];
            return (
              <Row key={k}>
                <span style={{ color, display: "inline-flex" }}>
                  <Icon size={20} weight={2.2} />
                </span>
                {label}
              </Row>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          Pink-ringed badges are live because the line is delayed. Grey ones are practice rounds.
        </p>
      </Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-body)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>{children}</span>;
}
