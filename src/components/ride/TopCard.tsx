import type { LeaderboardTeam, RideState } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { BoltIcon, LocateIcon, PinIcon, RideIcon, TrophyIcon } from "@/components/icons";
import { PaperCard } from "@/components/paper/Paper";
import { RadarIcon, SignalIcon, TunnelIcon, WalkIcon } from "./rideIcons";
import { fill, formatPoints, glow, TEAM_ON } from "./util";
import type { GpsState } from "./useRiderPosition";
import styles from "./ride.module.css";

interface TopCardProps {
  name: string | null;
  team: TeamRouteId | null;
  teamStats: LeaderboardTeam | null;
  active: boolean;
  state: RideState | null;
  gpsState: GpsState;
  accuracy: number;
  /** The arrow-key / SimTrigger demo stepper has pinned the rider to a station. */
  simulated: boolean;
  onRequestGps: () => void;
  canRequestGps: boolean;
}

const STATE_META: Record<RideState | "idle", { label: string; color: string; Icon: typeof RideIcon; spin?: boolean }> = {
  idle: { label: "Not riding", color: "var(--muted)", Icon: WalkIcon },
  searching: { label: "Finding train", color: "var(--ink)", Icon: RadarIcon, spin: true },
  on_vehicle: { label: "On train", color: "var(--glow-green)", Icon: RideIcon },
  in_tunnel: { label: "In tunnel", color: "var(--glow-orange)", Icon: TunnelIcon },
  left: { label: "Off train", color: "var(--muted)", Icon: WalkIcon },
};

/** Ride state as a stamped paper tag: icon + words. */
export function StateBadge({ active, state }: { active: boolean; state: RideState | null }) {
  const meta = STATE_META[active && state ? state : "idle"];
  const { Icon } = meta;
  return (
    <span role="status" className={styles.stateTag} style={{ color: meta.color }}>
      <span className={meta.spin ? styles.searchSpin : undefined} style={{ display: "grid" }}>
        <Icon size={18} weight={2.2} />
      </span>
      {meta.label}
    </span>
  );
}

type Tone = "good" | "warn" | "bad" | "muted";

function Chip({ tone, icon, children }: { tone: Tone; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={styles.chip} data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

/** Where the dot comes from: real GPS, locating, a simulated stop, or a fallback spot. */
function GpsChip(p: Pick<TopCardProps, "gpsState" | "accuracy" | "simulated" | "onRequestGps" | "canRequestGps">) {
  if (p.simulated)
    return (
      <Chip tone="warn" icon={<BoltIcon size={16} weight={2.2} />}>
        Simulated stop
      </Chip>
    );
  if (p.gpsState === "on")
    return (
      <Chip tone="good" icon={<SignalIcon size={16} weight={2.2} />}>
        GPS ±{Math.round(p.accuracy)} m
      </Chip>
    );
  if (p.gpsState === "locating")
    return (
      <Chip
        tone="muted"
        icon={
          <span className={styles.searchSpin} style={{ display: "grid" }}>
            <RadarIcon size={16} weight={2.2} />
          </span>
        }
      >
        Locating…
      </Chip>
    );
  if (p.canRequestGps)
    return (
      <button type="button" onClick={p.onRequestGps} className={`${styles.chip} ${styles.chipBtn}`}>
        <LocateIcon size={17} weight={2.3} />
        Use my location
      </button>
    );
  if (p.gpsState === "denied")
    return (
      <Chip tone="bad" icon={<PinIcon size={16} weight={2.2} />}>
        Location off · simulated spot
      </Chip>
    );
  if (p.gpsState === "unsupported")
    return (
      <Chip tone="bad" icon={<PinIcon size={16} weight={2.2} />}>
        No GPS · simulated spot
      </Chip>
    );
  return (
    <Chip tone="muted" icon={<PinIcon size={16} weight={2.2} />}>
      Simulated spot
    </Chip>
  );
}

export function TopCard(p: TopCardProps) {
  const initial = (p.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <PaperCard as="header" className={styles.topCard}>
      <div className={styles.topRow}>
        <span
          aria-hidden="true"
          className={styles.avatar}
          style={{ background: p.team ? fill(p.team) : "var(--cream-3)", color: p.team ? TEAM_ON[p.team] : "var(--ink)" }}
        >
          <span>{initial}</span>
        </span>
        <div className={styles.who}>
          <p className={styles.whoName}>{p.name ?? "Rider"}</p>
          {p.team ? (
            <p className={styles.whoTeam} style={{ color: glow(p.team) }}>
              {TEAMS[p.team].name} team
            </p>
          ) : null}
        </div>
        <StateBadge active={p.active} state={p.state} />
      </div>

      <div className={styles.statusRow}>
        <GpsChip {...p} />
        {p.team ? (
          <span className={styles.standing}>
            <TrophyIcon size={15} weight={2.3} />
            {p.teamStats ? (
              <span>
                #{p.teamStats.rank} · <strong>{formatPoints(p.teamStats.points)}</strong> pts
              </span>
            ) : (
              "warming up"
            )}
          </span>
        ) : null}
      </div>
    </PaperCard>
  );
}
