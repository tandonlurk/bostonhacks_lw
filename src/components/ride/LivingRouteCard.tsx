"use client";

// The Living Route Card: a folded paper ticket strip of the line you're on. Current station sits up
// front with its origami landmark, the next stop gets a folded "Next" flag, upcoming stops are punched
// holes along a strip in the line color, and hotspots near the route get a little paper flag.
// Data: routeStrip.ts (static geometry + demo stepper + ride session) and useHotspots (read-only).
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Hotspot } from "@/contracts";
import { TEAMS } from "@/contracts/routes";
import { HuntIcon, PinIcon } from "@/components/icons";
import { PaperCard } from "@/components/paper/Paper";
import { PaperFlag, StationArt } from "@/components/paper/origami";
import { formatDistance, distanceM } from "./geo";
import type { RouteStrip } from "./routeStrip";
import { fill, glow, TEAM_ON, TEAM_SHORT } from "./util";
import css from "./route.module.css";

const BEHIND = 1;
const AHEAD = 6;
const HOTSPOT_NEAR_M = 2500;

type Kind = "passed" | "current" | "next" | "ahead";

const KIND_LABEL: Record<Kind, string> = {
  passed: "passed",
  current: "you are here",
  next: "next stop",
  ahead: "upcoming",
};

export function LivingRouteCard({ strip, hotspots, riding }: { strip: RouteStrip; hotspots: Hotspot[]; riding: boolean }) {
  const { line, stops, current } = strip;
  const here = stops[current];
  const next = stops[current + 1] ?? null;
  const end = stops[stops.length - 1];
  const from = Math.max(0, current - BEHIND);
  const to = Math.min(stops.length, current + 1 + AHEAD);
  const shown = stops.slice(from, to);
  const remaining = stops.length - to;
  const hotspotAt = new Set(hotspots.map((h) => h.stationId));
  const atHotspot = hotspots.find((h) => h.stationId === here.id) ?? null;
  const near = hotspots
    .map((h) => ({ h, d: distanceM(here, h) }))
    .filter((x) => x.d <= HOTSPOT_NEAR_M && x.h.stationId !== here.id)
    .sort((a, b) => a.d - b.d)[0];
  const hotLabel = atHotspot ? `here at ${atHotspot.name}` : near ? `${near.h.name} · ${formatDistance(near.d)}` : null;
  const color = fill(line);
  const ink = glow(line);

  const where = strip.atStation ? (riding ? "Now at" : "At") : "Near";
  const announce = `${where} ${here.name}${next ? `. Next stop ${next.name}` : ". End of the line"}.`;

  return (
    <PaperCard as="section" aria-label={`${TEAMS[line].name} route`} className={css.card} style={{ "--line": color, "--line-ink": ink } as CSSProperties}>
      <header className={css.head}>
        <span className={css.tab} style={{ background: color, color: TEAM_ON[line] }} aria-hidden="true">
          {TEAM_SHORT[line]}
        </span>
        <div className={css.headText}>
          <p className={css.lineName}>{TEAMS[line].name}</p>
          <p className={css.toward}>
            toward <strong>{end.name}</strong>
          </p>
        </div>
        <Link href="/hunt" className={`paper-btn paper-btn--sm ${css.mapBtn}`}>
          <HuntIcon size={18} weight={2.2} />
          Full map
        </Link>
      </header>

      <div className={css.scroll} role="region" aria-label="Stops ahead" tabIndex={0}>
        <ol key={here.id} className={css.strip}>
          {from > 0 ? <li className={css.edge} aria-hidden="true" data-side="start" /> : null}
          {shown.map((s, i) => {
            const idx = from + i;
            const kind: Kind = idx < current ? "passed" : idx === current ? "current" : idx === current + 1 ? "next" : "ahead";
            const transfers = s.teams.filter((t) => t !== line);
            const hot = hotspotAt.has(s.id);
            return (
              <li key={s.id} className={css.stop} data-kind={kind} aria-current={kind === "current" ? "location" : undefined}>
                <div className={css.top}>
                  {kind === "current" ? (
                    <span className={css.art}>
                      <StationArt name={s.name} height={48} />
                    </span>
                  ) : kind === "next" ? (
                    <span className={css.flagPole} aria-hidden="true">
                      <span className={css.nextFlag}>Next</span>
                    </span>
                  ) : hot ? (
                    <span className={css.hotFlag} aria-hidden="true">
                      <PaperFlag height={26} tint="#c9962b" />
                    </span>
                  ) : null}
                </div>
                <div className={css.band}>
                  <span className={css.hole} />
                </div>
                <span className={css.name}>{s.name}</span>
                {kind === "current" ? (
                  <span className={css.sub}>{strip.atStation ? (riding ? "on board here" : "you're here") : `${formatDistance(strip.distanceM)} away`}</span>
                ) : transfers.length ? (
                  <span className={css.transfers} aria-hidden="true">
                    {transfers.map((t) => (
                      <i key={t} style={{ background: fill(t) }} />
                    ))}
                  </span>
                ) : null}
                <span className="visually-hidden">
                  {`, ${KIND_LABEL[kind]}`}
                  {transfers.length ? `, transfer to ${transfers.map((t) => TEAMS[t].name).join(" and ")}` : ""}
                  {hot ? ", hotspot" : ""}
                </span>
              </li>
            );
          })}
          {remaining > 0 ? (
            <li className={css.more}>
              <span className={css.moreCount}>+{remaining}</span>
              <span>more to {end.name}</span>
            </li>
          ) : (
            <li className={css.edge} aria-hidden="true" data-side="end" />
          )}
        </ol>
      </div>

      {hotLabel && !riding ? (
        <Link href="/hunt" className={css.hotRow}>
          <span className={css.hotIcon} aria-hidden="true">
            <PinIcon size={16} weight={2.4} />
          </span>
          <span className={css.hotText}>
            <strong>Hotspot</strong> {hotLabel}
          </span>
          <span className={css.hotGo}>Open</span>
        </Link>
      ) : null}

      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </PaperCard>
  );
}
