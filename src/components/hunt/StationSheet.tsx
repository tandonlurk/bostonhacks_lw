"use client";

import type { ChallengesResponse, Landmark, Perk } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { BoltIcon, ChevronIcon } from "@/components/icons";
import { LineChip } from "@/components/LineChip";
import { Eyebrow, PaperBadge } from "@/components/paper/Paper";
import { StationArt } from "@/components/paper/origami";
import { Sheet } from "@/components/ui/Sheet";
import { GAME_META, HEAT, heatLevel } from "./gameMeta";
import { ChallengeGame } from "./ChallengeGame";
import { BackIcon } from "./huntIcons";
import { LandmarkClaim } from "./LandmarkClaim";
import { STATION_BY_ID } from "./mapModel";
import type { GameKind, StationGame, StationGames } from "./placeholderGames";
import { SpendStrip } from "./SpendStrip";
import { StationHunt } from "./StationHunt";
import { kraftWell } from "./styles";
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
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 10 }}>
        <h2 style={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 700, lineHeight: 1.05 }}>{station.name}</h2>
        {/* Decorative origami art for the neighborhood (not a claim about the station itself). */}
        <span aria-hidden="true" style={{ flexShrink: 0, filter: "drop-shadow(1px 2px 0 rgba(74,52,22,0.18))" }}>
          <StationArt name={station.name} height={54} />
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {delayedHere.length ? (
          <PaperBadge bg="var(--hot)" ink="#fffaf0">
            <BoltIcon size={14} weight={2.4} />
            Delay on {delayedHere.map((t) => TEAMS[t].name).join(" + ")}
          </PaperBadge>
        ) : (
          <PaperBadge bg="var(--accent-soft)" ink="var(--accent)">
            Running normally
          </PaperBadge>
        )}
        {level ? (
          <PaperBadge bg="var(--cream-3)" ink={HEAT[level].ink}>
            {HEAT[level].label} · <span className="num">{Math.round(slowShare! * 100)}%</span> slow
          </PaperBadge>
        ) : null}
      </div>
      {delayedHere.length && delayMessage ? <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.45 }}>{delayMessage}</p> : null}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 22, marginBottom: 10 }}>
        <Eyebrow style={{ flex: 1 }}>{games?.live ? "Play while you wait" : list.length ? "Practice rounds" : "Mini-games"}</Eyebrow>
        {list.length ? <span className="hand" style={{ fontSize: 17, color: "var(--muted)" }}>{list.length} here</span> : null}
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
        <div style={{ ...kraftWell, padding: 16, fontSize: 14, color: "var(--muted)" }}>
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
  const tag = game.kind === "challenge" ? "MAX PTS" : game.rewardPoints === 0 ? "PRACTICE" : real ? "PTS" : "PREVIEW";
  return (
    <button
      type="button"
      onClick={onPlay}
      className="paper"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 76,
        padding: "12px 14px 12px 12px",
        borderRadius: 6,
        textAlign: "left",
        borderLeft: live ? "4px solid var(--hot)" : "1px solid var(--paper-edge)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 52,
          height: 52,
          borderRadius: 6,
          background: `color-mix(in srgb, ${color} 13%, var(--cream))`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          boxShadow: "1px 2px 0 rgba(74,52,22,0.12)",
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={28} weight={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 650, fontSize: 16.5 }}>{game.title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{blurb}</span>
        {live ? <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a8243f", marginTop: 3, letterSpacing: "0.06em" }}>LIVE DURING DELAY</span> : null}
      </span>
      <span style={{ textAlign: "right", flexShrink: 0 }}>
        <span className="num" style={{ display: "block", fontWeight: 700, fontSize: 19, color: "var(--accent)", lineHeight: 1.1 }}>+{game.rewardPoints}</span>
        <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 2 }}>{tag}</span>
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
          className="paper-btn"
          style={{ width: 44, height: 44, padding: 0, flexShrink: 0 }}
        >
          <BackIcon size={20} weight={2.3} />
        </button>
        <span style={{ color, display: "inline-flex" }}>
          <Icon size={22} weight={2.2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>{label}</p>
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
