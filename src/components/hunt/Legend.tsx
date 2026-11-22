"use client";

import { TEAMS, TEAM_ROUTE_IDS } from "@/contracts/routes";
import { Eyebrow } from "@/components/paper/Paper";
import { PaperFlag } from "@/components/paper/origami";
import { GAME_META, GAME_ORDER, HEAT, type HeatLevel } from "./gameMeta";
import { LINE_FILL } from "./mapModel";

const HEAT_ORDER: HeatLevel[] = ["ok", "slow", "crawl"];

/** Map key on a sheet of card stock: route strips, station rings, heat, game symbols and markers. */
export function Legend({ heatAvailable }: { heatAvailable: boolean }) {
  return (
    <section
      id="hunt-legend"
      aria-label="Map legend"
      className="paper paper--fold paper-unfold"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 84px)",
        left: 12,
        right: 12,
        zIndex: 6,
        maxHeight: "calc(100dvh - var(--banner-space) - 84px - var(--nav-clearance) - 24px)",
        overflowY: "auto",
        borderRadius: 8,
        padding: 16,
        boxShadow: "var(--shadow-float)",
        display: "grid",
        gap: 14,
      }}
    >
      <Group title="Lines">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
          {TEAM_ROUTE_IDS.map((t) => (
            <Row key={t}>
              <Strip color={LINE_FILL[t]} />
              {TEAMS[t].name}
            </Row>
          ))}
          <Row>
            <svg aria-hidden="true" width="24" height="10" style={{ flexShrink: 0 }}>
              <line x1="2" y1="5" x2="22" y2="5" stroke="var(--hot)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5" />
            </svg>
            Delayed line
          </Row>
        </div>
      </Group>

      <Group title={heatAvailable ? "Station speed, last 2 hours" : "Station speed (no history yet)"}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
          {HEAT_ORDER.map((h) => (
            <Row key={h}>
              <Ring hole={HEAT[h].color} />
              <span>
                {HEAT[h].label} <span style={{ color: "var(--muted)" }}>{HEAT[h].range}</span>
              </span>
            </Row>
          ))}
          <Row>
            <Ring hole="#cdb994" />
            No data
          </Row>
          <Row>
            <Ring hole="#cdb994" transfer />
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
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          <Row>
            <PaperFlag height={20} tint="#c8325a" />
            Flagged note: live now, the line is delayed
          </Row>
          <Row>
            <span aria-hidden="true" className="paper-pin" style={{ position: "relative", display: "inline-block", width: 12, height: 12, margin: "0 4px" }} />
            Pinned note: practice round
          </Row>
          <Row>
            <PaperFlag height={20} tint="#2f6b45" />
            Green flag: hotspot with a meeting bonus
          </Row>
        </div>
      </Group>
    </section>
  );
}

function Strip({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" width="26" height="10" style={{ flexShrink: 0 }}>
      <rect x="2.6" y="3.6" width="22" height="5" rx="2.5" fill="rgba(60,40,18,0.3)" />
      <rect x="1.6" y="2" width="22" height="5" rx="2.5" fill={color} />
      <rect x="3" y="2.8" width="19" height="1.2" rx="0.6" fill="rgba(255,250,240,0.45)" />
    </svg>
  );
}

function Ring({ hole, transfer }: { hole: string; transfer?: boolean }) {
  const r = transfer ? 7 : 5.5;
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="-9 -9 18 18" style={{ flexShrink: 0 }}>
      <circle cx={0.6} cy={1} r={r} fill="rgba(74,52,22,0.24)" />
      <circle r={r} fill="#fffaf0" stroke="#2a241d" strokeWidth={transfer ? 1.6 : 1.3} />
      {transfer ? <circle r={r - 2.4} fill="none" stroke="#2a241d" strokeWidth={0.9} /> : null}
      <circle r={2.4} fill={hole} />
    </svg>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow as="h2" style={{ marginBottom: 8 }}>
        {title}
      </Eyebrow>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>{children}</span>;
}
