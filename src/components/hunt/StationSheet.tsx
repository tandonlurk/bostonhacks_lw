"use client";

import type { ChallengesResponse, Landmark, Perk } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { BoltIcon, ChevronIcon } from "@/components/icons";
import { LineChip } from "@/components/LineChip";
import { Sheet } from "@/components/ui/Sheet";
import { GAME_META, HEAT, heatLevel } from "./gameMeta";
import { ChallengeGame } from "./ChallengeGame";
import { BackIcon } from "./huntIcons";
import { LandmarkClaim } from "./LandmarkClaim";
import { STATION_BY_ID } from "./mapModel";
import type { GameKind, StationGame, StationGames } from "./placeholderGames";
import { SpendStrip } from "./SpendStrip";
import { StationHunt } from "./StationHunt";
import { eyebrow } from "./styles";
import { TriviaGame } from "./TriviaGame";

interface StationSheetProps {
  stopId: string | null;
  games: StationGames | undefined;
  /** Active game id inside the sheet, or null for the game list. */
  activeGameId: string | null;
  onPlay: (gameId: string | null) => void;
  onClose: () => void;
  delayedTeams: TeamRouteId[];
  delayMessage: string | null;
  slowShare: number | undefined;
  riderId: string | null;
  balance: number | null;
  perks: Perk[];
  landmarks: Landmark[];
  /** Live delay photo challenges, or null when unavailable (then the placeholder photo game shows instead). */
  challenges: ChallengesResponse | null;
  onEarned: () => void;
}

export function StationSheet(props: StationSheetProps) {
  const { stopId, games, activeGameId, onPlay, onClose } = props;
  const station = stopId ? STATION_BY_ID.get(stopId) : undefined;
  const active = games?.games.find((g) => g.id === activeGameId) ?? null;

  return (
    <Sheet open={!!station} onClose={onClose} title={station?.name ?? "Station"} hideTitle>
      {station ? (
        active ? (
          <GameView {...props} game={active} onBack={() => onPlay(null)} />
        ) : (
          <StationOverview {...props} />
        )
      ) : null}
    </Sheet>
  );
}

function StationOverview({ stopId, games, onPlay, delayedTeams, delayMessage, slowShare, balance, perks }: StationSheetProps) {
  const station = STATION_BY_ID.get(stopId!)!;
  const delayedHere = station.teams.filter((t) => delayedTeams.includes(t));
  const level = slowShare == null ? null : heatLevel(slowShare);
  const list = games?.games ?? [];

  return (
    <div style={{ marginTop: -38 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingRight: 52 }}>
        {station.teams.map((t) => (
          <LineChip key={t} teamRouteId={t} size="sm" />
        ))}
      </div>
      <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05, marginTop: 10 }}>{station.name}</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {delayedHere.length ? (
          <StatusPill color="var(--hot)" strong>
            <BoltIcon size={14} weight={2.4} />
            Delay on {delayedHere.map((t) => TEAMS[t].name).join(" + ")}
          </StatusPill>
        ) : (
          <StatusPill color="var(--glow-green)">Running normally</StatusPill>
        )}
        {level ? (
          <StatusPill color={HEAT[level].color}>
            {HEAT[level].label} · <span className="num">{Math.round(slowShare! * 100)}%</span> slow
          </StatusPill>
        ) : null}
      </div>
      {delayedHere.length && delayMessage ? <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.45 }}>{delayMessage}</p> : null}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 22, marginBottom: 10 }}>
        <p style={{ ...eyebrow, flex: 1 }}>{games?.live ? "Play while you wait" : list.length ? "Practice rounds" : "Mini-games"}</p>
        {list.length ? <span style={{ fontSize: 12, color: "var(--muted)" }}>{list.length} here</span> : null}
      </div>

      {list.length ? (
        <ul style={{ listStyle: "none", display: "grid", gap: 10 }}>
          {list.map((g) => (
            <li key={g.id}>
              <GameCard game={g} live={!!games?.live} onPlay={() => onPlay(g.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ padding: 16, borderRadius: 18, background: "var(--surface-2)", fontSize: 14, color: "var(--muted)" }}>
          Nothing to play here right now. Games pop up along a line when it slows down.
        </div>
      )}

      <SpendStrip balance={balance} perks={perks} />
    </div>
  );
}

function GameCard({ game, live, onPlay }: { game: StationGame; live: boolean; onPlay: () => void }) {
  const { Icon, color, blurb } = GAME_META[game.kind];
  // Game availability and maximum rewards come from the server catalog.
  const real = game.kind === "landmark" || game.kind === "challenge" || game.kind === "trivia" || game.kind === "clue";
  return (
    <button
      type="button"
      onClick={onPlay}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 76,
        padding: "12px 14px 12px 12px",
        borderRadius: 20,
        border: `1px solid ${live ? "rgba(255,61,127,0.35)" : "var(--border)"}`,
        background: "var(--surface-2)",
        textAlign: "left",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: 16, background: `color-mix(in srgb, ${color} 16%, transparent)`, color, flexShrink: 0 }}>
        <Icon size={28} weight={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>{game.title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{blurb}</span>
      </span>
      <span style={{ textAlign: "right", flexShrink: 0 }}>
        <span className="num" style={{ display: "block", fontWeight: 800, fontSize: 18, color: "var(--accent)", lineHeight: 1.1 }}>+{game.rewardPoints}</span>
        <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 2 }}>
          {game.kind === "challenge" ? "MAX PTS" : game.rewardPoints === 0 ? "PRACTICE" : real ? "PTS" : "PREVIEW"}
        </span>
      </span>
      <ChevronIcon size={16} weight={2.4} style={{ color: "var(--muted)", flexShrink: 0 }} />
    </button>
  );
}

function GameView({ stopId, game, onBack, riderId, landmarks, challenges, onEarned }: StationSheetProps & { game: StationGame; onBack: () => void }) {
  const station = STATION_BY_ID.get(stopId!)!;
  const kind: GameKind = game.kind;
  const landmark = kind === "landmark" ? landmarks.find((l) => game.id.endsWith(`:${l.id}`)) : undefined;
  const { Icon, color, label } = GAME_META[kind];

  return (
    <div style={{ marginTop: -38 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 52, marginBottom: 14 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to this station's games"
          style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--surface-2)", flexShrink: 0 }}
        >
          <BackIcon size={20} weight={2.3} />
        </button>
        <span style={{ color, display: "inline-flex" }}>
          <Icon size={22} weight={2.2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>{label}</p>
          <p style={{ fontSize: 12.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{station.name}</p>
        </div>
      </div>

      {kind === "trivia" ? <TriviaGame key={game.id} stopId={station.id} game={game} onExit={onBack} riderId={riderId} onEarned={onEarned} /> : null}
      {kind === "clue" || kind === "photo" ? <StationHunt stopId={station.id} riderId={riderId} photoFirst={kind === "photo"} onEarned={onEarned} /> : null}
      {kind === "challenge" ? (
        challenges ? (
          <ChallengeGame data={challenges} riderId={riderId} onEarned={onEarned} />
        ) : (
          <p style={{ color: "var(--muted)" }}>Photo challenges close when the delay clears.</p>
        )
      ) : null}
      {kind === "landmark" ? (
        landmark ? (
          <LandmarkClaim landmark={landmark} riderId={riderId} onClaimed={onEarned} />
        ) : (
          <p style={{ color: "var(--muted)" }}>This landmark isn&apos;t available right now.</p>
        )
      ) : null}
    </div>
  );
}

function StatusPill({ color, strong, children }: { color: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: "var(--radius-pill)",
        fontSize: 12.5,
        fontWeight: 750,
        color: strong ? "#fff" : color,
        background: strong ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
        border: strong ? "none" : `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      {strong ? null : <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />}
      {children}
    </span>
  );
}
