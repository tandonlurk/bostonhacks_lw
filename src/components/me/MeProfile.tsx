"use client";

import { useCallback, useRef, useState } from "react";
import type { Rider } from "@/contracts";
import { useTokens } from "@/hooks/useTokens";
import { useLandmarks } from "@/hooks/useLandmarks";
import { useProfileBio, useProfileInterests } from "@/hooks/useProfileLocal";
import { ActivityList } from "./ActivityFeed";
import { EditProfileSheet } from "./EditProfileSheet";
import { EmptyHint, Highlights } from "./Highlights";
import { InterestsSection, InterestsSheet } from "./Interests";
import { ProfileHero } from "./ProfileHero";
import { SectionTitle } from "./SectionTitle";
import { glowVar } from "./team";
import s from "./me.module.css";

type MeSheet = "edit" | "interests" | null;

/** The joined rider's Instagram-style profile. */
export function MeProfile({ rider }: { rider: Rider }) {
  const tokens = useTokens(rider.riderId);
  const landmarks = useLandmarks(rider.riderId);
  const [interests, setInterests] = useProfileInterests();
  const [bio] = useProfileBio();
  const [sheet, setSheet] = useState<MeSheet>(null);
  const [now] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showError = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  const close = useCallback(() => setSheet(null), []);
  const ledger = tokens.data?.ledger ?? [];
  const handle = rider.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <header className="screen-header" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 56, background: "transparent" }}>
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: glowVar(rider.homeTeamRouteId), boxShadow: `0 0 10px ${glowVar(rider.homeTeamRouteId)}` }} />
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>
          <span className="visually-hidden">Profile of </span>@{handle || "rider"}
        </h1>
      </header>

      {toast ? (
        <p
          role="alert"
          className="glass"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 12px)",
            zIndex: 70,
            padding: "12px 16px",
            borderRadius: 16,
            fontSize: 14,
            fontWeight: 600,
            borderColor: "color-mix(in srgb, var(--hot) 50%, transparent)",
            animation: "fade-in 200ms",
          }}
        >
          {toast}
        </p>
      ) : null}

      <ProfileHero rider={rider} bio={bio} onEdit={() => setSheet("edit")} onError={showError} />

      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 24 }}>
        <Highlights ledger={ledger} landmarks={landmarks.data} team={rider.homeTeamRouteId} now={now} />

        <InterestsSection selected={interests} onEdit={() => setSheet("interests")} />

        <section aria-labelledby="me-activity" style={{ padding: "0 var(--space-4)" }}>
          <SectionTitle id="me-activity" title="Recent activity" />
          {tokens.loading && !tokens.data ? (
            <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={s.skel} style={{ display: "block", height: 52, borderRadius: 14 }} />
              ))}
            </div>
          ) : (
            <ActivityList
              entries={ledger.slice(0, 12)}
              team={rider.homeTeamRouteId}
              now={now}
              empty={<EmptyHint text="Nothing yet. Your first verified ride lands here." />}
            />
          )}
        </section>
      </div>

      <EditProfileSheet open={sheet === "edit"} onClose={close} rider={rider} onError={showError} />
      <InterestsSheet open={sheet === "interests"} onClose={close} selected={interests} onChange={setInterests} />
    </div>
  );
}
