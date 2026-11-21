import type { SideQuest, TeamRouteId } from "@/contracts";
import { TEAMS } from "@/contracts/routes";
import { CheckIcon, StarIcon } from "@/components/icons";
import styles from "./sideQuest.module.css";

/** The server owns quest eligibility, progress and rewards; this card never awards locally. */
export function SideQuestCard({ quest, homeTeam, compact = false }: {
  quest: SideQuest;
  homeTeam?: TeamRouteId | null;
  compact?: boolean;
}) {
  const target = Math.max(1, quest.targetMinutes ?? 3);
  const progress = quest.done ? target : Math.max(0, Math.min(target, quest.progressMinutes ?? 0));
  const teamName = homeTeam && homeTeam !== "Silver" ? TEAMS[homeTeam].name : "your home team";
  return (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`} aria-label={quest.title} data-done={quest.done}>
      <div className={styles.header}>
        <span className={styles.kicker}><span className={styles.lineBadge} aria-hidden="true">SL</span>DAILY SIDE QUEST</span>
        <span className={styles.reward}>{quest.done ? <CheckIcon size={16} weight={2.5} /> : <StarIcon size={16} weight={2.3} />} {quest.done ? `+${quest.pointsAwarded} earned` : `+${quest.points} pts`}</span>
      </div>
      <h3 className={styles.title}>{quest.title}</h3>
      {!compact && <p className={styles.intro}>Take the Silver Line for {target} verified minutes in one ride. A little detour, a bonus for {teamName}.</p>}
      <div className={styles.progressRow}>
        <progress className={styles.progress} max={target} value={progress} aria-label={`${quest.title} verified ride minutes`} />
        <span className={styles.counter}>{progress}/{target} min</span>
      </div>
      <p className={styles.note} role="status">{quest.done ? `Completed today · bonus goes to ${teamName}.` : compact ? `One ride · points go to ${teamName}.` : "No delay needed. Start a Silver Line ride from the Ride tab; verified minutes count automatically."}</p>
      {!compact && <p className={styles.reset}>Once per UTC day. Silver is a line you ride; your team stays the same.</p>}
    </article>
  );
}
