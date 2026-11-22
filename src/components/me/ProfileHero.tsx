"use client";

import type { Rider } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { LineChip } from "@/components/LineChip";
import { CoinIcon, EditIcon, FlameIcon, StarIcon } from "@/components/icons";
import { PaperT, StationArt } from "@/components/paper/origami";
import { ProfileAvatar } from "./ProfileAvatar";
import { TeamLineBackdrop } from "./TeamLineBackdrop";
import { lineVar } from "./team";
import s from "./me.module.css";

interface ProfileHeroProps {
  rider: Rider;
  bio: string | null;
  /** ISO time of the rider's first ledger entry, shown as the passport issue date. Null until they earn one. */
  issuedAt?: string | null;
  onEdit: () => void;
  onError: (message: string) => void;
}

// Readable ink on each line color (white fails on Orange and Silver).
const BAND_INK: Record<TeamRouteId, string> = { Red: "#fffaf0", Orange: "#2a241d", Blue: "#fffaf0", Green: "#fffaf0", Silver: "#2a241d" };

function issuedLabel(iso: string | null | undefined): string {
  if (!iso) return "On your first ride";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "On your first ride";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Decorative machine-readable zone built from the rider's own name, line and id. */
function mrzLines(rider: Rider): [string, string] {
  const name = rider.displayName.toUpperCase().replace(/[^A-Z0-9]+/g, "<");
  const id = rider.riderId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
  const pad = (s: string) => (s + "<".repeat(44)).slice(0, 44);
  return [pad(`P<TSPOTS<${name}<<`), pad(`${id}<${rider.homeTeamRouteId.toUpperCase()}<LINE<<BOSTON`)];
}

/** The rider's passport page: line-color cover band, photo, identity fields and a papercut route watermark. */
export function ProfileHero({ rider, bio, issuedAt, onEdit, onError }: ProfileHeroProps) {
  const team = TEAMS[rider.homeTeamRouteId];
  const [mrz1, mrz2] = mrzLines(rider);
  return (
    <section aria-label="Rider passport" style={{ padding: "4px var(--space-4) 0" }}>
      <div className={`${s.passport} ${s.rise}`}>
        <div className={s.passportBand} style={{ ["--band" as string]: lineVar(rider.homeTeamRouteId), color: BAND_INK[rider.homeTeamRouteId] }}>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Commonwealth of the T
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, letterSpacing: "0.04em" }}>Rider Passport</span>
          </span>
          <PaperT height={30} tint="#fbf6ec" />
        </div>

        <div style={{ position: "relative", padding: "16px 14px 0" }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: "0 0 -40px 30%", overflow: "hidden", pointerEvents: "none" }}>
            <TeamLineBackdrop team={rider.homeTeamRouteId} />
          </div>

          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
            <ProfileAvatar name={rider.displayName} team={rider.homeTeamRouteId} size={92} onError={onError} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <div className={s.field}>
                <span className={s.fieldLabel}>Name</span>
                <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 24,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {rider.displayName}
                  </h2>
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label="Edit profile"
                    className={`paper-btn paper-btn--ghost ${s.press}`}
                    style={{ flex: "none", width: "var(--tap-min)", padding: 0, marginLeft: 4, color: "var(--muted)" }}
                  >
                    <EditIcon size={17} />
                  </button>
                </span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Home line</span>
                <span>
                  <LineChip teamRouteId={rider.homeTeamRouteId} size="sm" />
                </span>
              </div>
            </div>
          </div>

          <dl style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: "10px 12px", marginTop: 14, alignItems: "end" }}>
            <div className={s.field}>
              <dt className={s.fieldLabel}>District</dt>
              <dd className={s.fieldValue}>{team.districtName}</dd>
            </div>
            <StationArt name={team.districtName} height={34} style={{ gridRow: "span 2", alignSelf: "end" }} />
            <div className={s.field}>
              <dt className={s.fieldLabel}>Issued</dt>
              <dd className={s.fieldValue}>
                {issuedAt ? <time dateTime={issuedAt}>{issuedLabel(issuedAt)}</time> : issuedLabel(null)}
              </dd>
            </div>
          </dl>

          {bio ? (
            <p style={{ position: "relative", marginTop: 12, fontSize: 15, lineHeight: 1.45, color: "var(--ink)", overflowWrap: "anywhere" }}>
              <span className={s.fieldLabel} style={{ display: "block", marginBottom: 2 }}>
                Remarks
              </span>
              {bio}
            </p>
          ) : null}
        </div>

        <p className={s.mrz} aria-hidden="true">
          {mrz1}
          <br />
          {mrz2}
        </p>
      </div>

      <StatsRow rider={rider} />
    </section>
  );
}

function StatsRow({ rider }: { rider: Rider }) {
  const stats = [
    { label: "points", value: rider.points, Icon: StarIcon, color: "var(--accent)" },
    { label: "CitiTokens", value: rider.tokens, Icon: CoinIcon, color: "var(--gold-ink)" },
    { label: "day streak", value: rider.streakDays, Icon: FlameIcon, color: rider.streakDays > 0 ? "var(--glow-orange)" : "var(--muted)" },
  ];
  return (
    <dl className={`${s.stats} ${s.rise}`} style={{ marginTop: 14 }}>
      {stats.map(({ label, value, Icon, color }) => (
        <div key={label} className={s.stat}>
          <dt style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", fontWeight: 650 }}>
            <Icon size={14} weight={2.2} style={{ color }} />
            {label}
          </dt>
          <dd className="num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: "var(--ink)" }}>
            {value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}
