"use client";

// Friends (on the Me screen): where the people you ride with are right now, on a live map and in a list.
import { useEffect, useState } from "react";
import type { Friend, FriendsResponse } from "@/contracts";
import { TEAMS } from "@/contracts/routes";
import { RIDER_ID_KEY } from "@/hooks/useRider";
import { SectionTitle } from "@/components/me/SectionTitle";
import { FriendsMap } from "./FriendsMap";

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

/** Friends block for the Me screen: live map + list of the people you ride with. */
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
      <div
        aria-label="Friends map"
        style={{ borderRadius: "var(--radius-card)", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", aspectRatio: "1 / 1", maxHeight: 360, width: "100%" }}
      >
        <FriendsMap friends={friends} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {friends.map((f) => {
          const team = TEAMS[f.teamRouteId];
          const selected = f.id === selectedId;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setSelectedId(selected ? null : f.id)}
                aria-pressed={selected}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: 14, minHeight: 72,
                  borderRadius: "var(--radius-card)", background: selected ? "var(--surface-2)" : "var(--surface)",
                  border: `1px solid ${selected ? team.color : "var(--border)"}`, color: "var(--ink)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ flex: "none", width: 46, height: 46, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 800, background: "var(--surface-3)", border: `3px solid ${team.color}` }}
                >
                  {f.initials}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 16 }}>{f.name}</strong>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: team.color, color: f.teamRouteId === "Orange" ? "#14181c" : "#fff" }}>{team.name}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 4 }}>
                    {f.status === "riding" ? <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: "var(--hot)", flex: "none" }} /> : null}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.headline}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{f.detail}</span>
                </span>
                <span style={{ flex: "none", textAlign: "right" }}>
                  <span className="num" style={{ display: "block", fontWeight: 800, color: "var(--accent)" }}>{f.points}</span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{f.streakDays}-day streak</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
