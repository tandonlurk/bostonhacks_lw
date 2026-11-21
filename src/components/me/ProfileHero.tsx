"use client";

import type { Rider } from "@/contracts";
import { TEAMS } from "@/contracts/routes";
import { LineChip } from "@/components/LineChip";
import { CoinIcon, EditIcon, FlameIcon, PinIcon, StarIcon } from "@/components/icons";
import { ProfileAvatar } from "./ProfileAvatar";
import { TeamLineBackdrop } from "./TeamLineBackdrop";
import s from "./me.module.css";

interface ProfileHeroProps {
  rider: Rider;
  bio: string | null;
  onEdit: () => void;
  onError: (message: string) => void;
}

export function ProfileHero({ rider, bio, onEdit, onError }: ProfileHeroProps) {
  const team = TEAMS[rider.homeTeamRouteId];
  return (
    <section aria-label="Profile" style={{ position: "relative", padding: "8px var(--space-4) 0" }}>
      <div style={{ position: "absolute", inset: "-90px 0 -10px", overflow: "hidden", pointerEvents: "none" }}>
        <TeamLineBackdrop team={rider.homeTeamRouteId} />
      </div>

      <div className={s.rise} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <ProfileAvatar name={rider.displayName} team={rider.homeTeamRouteId} onError={onError} />

        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 14, maxWidth: "100%" }}>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.05,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingLeft: 44, // balances the pencil so the name stays optically centered
            }}
          >
            {rider.displayName}
          </h2>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit profile"
            className={s.press}
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: "var(--tap-min)",
              height: "var(--tap-min)",
              border: "none",
              borderRadius: "50%",
              background: "transparent",
              color: "var(--muted)",
            }}
          >
            <EditIcon size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
          <LineChip teamRouteId={rider.homeTeamRouteId} size="sm" />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--muted)" }}>
            <PinIcon size={14} weight={2} />
            {team.districtName}
          </span>
        </div>

        {bio ? (
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.4, maxWidth: 320, color: "var(--ink)", overflowWrap: "anywhere" }}>{bio}</p>
        ) : null}
      </div>

      <StatsRow rider={rider} />
    </section>
  );
}

function StatsRow({ rider }: { rider: Rider }) {
  const stats = [
    { label: "points", value: rider.points, Icon: StarIcon, color: "var(--accent)" },
    { label: "CitiTokens", value: rider.tokens, Icon: CoinIcon, color: "var(--ink)" },
    { label: "day streak", value: rider.streakDays, Icon: FlameIcon, color: rider.streakDays > 0 ? "var(--glow-orange)" : "var(--muted)" },
  ];
  return (
    <dl
      className={`glass ${s.rise}`}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        marginTop: 18,
        borderRadius: "var(--radius-card)",
        padding: "14px 4px",
      }}
    >
      {stats.map(({ label, value, Icon, color }, i) => (
        <div
          key={label}
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "center",
            gap: 2,
            borderLeft: i ? "1px solid var(--glass-border)" : undefined,
          }}
        >
          <dt style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            <Icon size={13} weight={2.2} style={{ color }} />
            {label}
          </dt>
          <dd className="num" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color }}>
            {value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}
