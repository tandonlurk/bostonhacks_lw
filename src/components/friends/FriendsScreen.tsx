"use client";

// Friends (on the Me screen): where the people you ride with are right now, on a live map and in a list.
import { useEffect, useState } from "react";
import type { Friend, FriendsResponse } from "@/contracts";
import { TEAMS } from "@/contracts/routes";
import { RIDER_ID_KEY } from "@/hooks/useRider";
import { SectionTitle } from "@/components/me/SectionTitle";
import { PaperBadge, Tape } from "@/components/paper/Paper";
import { StationArt } from "@/components/paper/origami";
import s from "@/components/me/me.module.css";
import { FriendsMap } from "./FriendsMap";

// Readable ink on each line color (white fails on Orange and Silver).
const BADGE_INK: Record<string, string> = { Red: "#fff", Orange: "#2a241d", Blue: "#fff", Green: "#fff", Silver: "#2a241d" };

function useFriends(): { friends: Friend[]; error: boolean } {
  const [state, setState] = useState<{ friends: Friend[]; error: boolean }>({ friends: [], error: false });
  useEffect(() => {
    let cancelled = false;
    const riderId = window.localStorage.getItem(RIDER_ID_KEY) ?? "guest";
    const load = () =>
      fetch(`/api/riders/${encodeURIComponent(riderId)}/friends`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<FriendsResponse>) : Promise.reject(new Error(String(r.status)))))
        .then((b) => !cancelled && setState({ friends: b.friends, error: false }))
        .catch(() => !cancelled && setState((s) => ({ ...s, error: s.friends.length === 0 })));
    void load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return state;
}

/** Small cut-paper route strip in the friend's line color: three stops, with the friend riding between them. */
function RouteStrip({ color, riding }: { color: string; riding: boolean }) {
  return (
    <svg aria-hidden="true" width="30" height="56" viewBox="0 0 30 56" style={{ display: "block", overflow: "visible" }}>
      <path d="M15 4 C 9 16, 21 26, 15 38 S 13 50, 15 52" fill="none" stroke="#4a3416" strokeOpacity={0.35} strokeWidth={7} strokeLinecap="round" transform="translate(1.5 1.5)" />
      <path d="M15 4 C 9 16, 21 26, 15 38 S 13 50, 15 52" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      {[4, 28, 52].map((y) => (
        <circle key={y} cx={y === 28 ? 15.4 : 15} cy={y} r={2.6} fill="#fbf6ec" stroke="rgba(74,52,22,0.4)" strokeWidth={0.8} />
      ))}
      {riding ? <path d="M15 12 l6 4 -6 4 -6 -4 z" fill="#fbf6ec" stroke="#2a241d" strokeWidth={1.4} strokeLinejoin="round" /> : (
        <circle cx={15.4} cy={28} r={5} fill="#fbf6ec" stroke="#2a241d" strokeWidth={1.6} />
      )}
    </svg>
  );
}

/** Friends block for the Me screen: papercut live map + paper cards for the people you ride with. */
export function FriendsSection() {
  const { friends, error } = useFriends();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const riding = friends.filter((f) => f.status === "riding").length;

  return (
    <section aria-labelledby="me-friends" style={{ padding: "0 var(--space-4)" }}>
      <SectionTitle
        id="me-friends"
        title="Friends"
        action={
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {friends.length ? `${riding} of ${friends.length} riding now` : error ? "Couldn't load friends" : "Finding friends…"}
          </span>
        }
      />
      <div className={s.mapFrame}>
        <Tape rotate={-8} style={{ top: -6, left: 14, marginLeft: 0, width: 56 }} />
        <Tape rotate={7} style={{ top: -6, left: "auto", right: 14, marginLeft: 0, width: 56 }} />
        <div className={s.mapSheet} aria-label="Friends map">
          <FriendsMap friends={friends} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {friends.map((f) => {
          const team = TEAMS[f.teamRouteId];
          const selected = f.id === selectedId;
          const isRiding = f.status === "riding";
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setSelectedId(selected ? null : f.id)}
                aria-pressed={selected}
                className={s.friendCard}
                style={{ ["--team" as string]: team.color }}
              >
                <RouteStrip color={team.color} riding={isRiding} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "none",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 12,
                        background: "var(--cream-3)",
                        boxShadow: `0 0 0 2px ${team.color}, 0 2px 0 2px var(--fold-shadow)`,
                      }}
                    >
                      {f.initials}
                    </span>
                    <strong style={{ fontSize: 16, fontFamily: "var(--font-display)" }}>{f.name}</strong>
                    <PaperBadge bg={team.color} ink={BADGE_INK[f.teamRouteId]} style={{ fontSize: 11, height: 20 }}>
                      {team.name}
                    </PaperBadge>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, marginTop: 6 }}>
                    <span
                      style={{
                        flex: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: isRiding ? "var(--hot)" : "var(--muted)",
                      }}
                    >
                      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: isRiding ? "var(--hot)" : "transparent", border: isRiding ? "none" : "1.5px solid var(--muted)" }} />
                      {isRiding ? "Riding" : "At station"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.headline}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                    <StationArt name={`${f.detail} ${f.headline}`} height={18} style={{ flex: "none" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.detail}</span>
                  </span>
                </span>
                <span style={{ textAlign: "right", alignSelf: "start" }}>
                  <span className="num" style={{ display: "block", fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>{f.points}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>pts</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{f.streakDays}-day streak</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
