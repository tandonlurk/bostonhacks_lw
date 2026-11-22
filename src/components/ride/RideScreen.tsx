"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useVehicles } from "@/hooks/useVehicles";
import { USE_MOCKS } from "@/hooks/useMocks";
import { BoltIcon, CloseIcon } from "@/components/icons";
import { PaperButton } from "@/components/paper/Paper";
import { useHotspots } from "@/components/hunt/useHotspots";
import { useRideContext, type RideContextValue } from "./RideSessionProvider";
import { NavMap, type MapMode } from "./NavMap";
import { TopCard } from "./TopCard";
import { IdleDock } from "./IdleDock";
import { LivePanel } from "./LivePanel";
import { SummaryCard } from "./SummaryCard";
import { JoinCard } from "./JoinCard";
import { ManualPickSheet } from "./ManualPickSheet";
import { useRiderPosition } from "./useRiderPosition";
import { useNearbyStation } from "./useNearbyStation";
import { useDemoSpot, useDemoStepper } from "./demoLocation";
import { NextTrainTimer } from "./NextTrainTimer";
import { LivingRouteCard } from "./LivingRouteCard";
import { deriveRouteStrip } from "./routeStrip";
import { DemoAwardPop } from "./DemoAwardPop";
import { previewNearby, usePreview, usePreviewContext } from "./preview";
import { nearestPlace } from "./geo";
import { useHydrated, useReducedMotion } from "./util";
import styles from "./ride.module.css";

type Phase = "loading" | "join" | "idle" | "live" | "summary";

const ANCHOR: Record<Phase, number> = { loading: 0.45, join: 0.2, idle: 0.45, live: 0.42, summary: 0.33 };
/** Map labels above this y would hide under the top card + route card. */
const LABEL_TOP: Record<Phase, number> = { loading: 120, join: 60, idle: 260, live: 260, summary: 120 };
const MAP_MODE: Record<Phase, MapMode> = { loading: "idle", join: "onboarding", idle: "idle", live: "riding", summary: "idle" };

function ErrorToast({ message, onDismiss, onPickStop }: { message: string; onDismiss: () => void; onPickStop?: () => void }) {
  return (
    <div
      role="alert"
      className={`paper ${styles.rise}`}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 6px 12px", borderLeft: "4px solid var(--brick)" }}
    >
      <BoltIcon size={20} weight={2.2} style={{ color: "var(--brick)", flexShrink: 0 }} />
      <p style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.35 }}>{message}</p>
      {onPickStop ? (
        <PaperButton size="sm" onClick={onPickStop} style={{ minHeight: 44, flexShrink: 0 }}>
          Pick stop
        </PaperButton>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{ display: "grid", placeItems: "center", width: 44, height: 44, border: "none", background: "none", flexShrink: 0, color: "var(--muted)" }}
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

export function RideScreen() {
  const ctx = useRideContext() as RideContextValue;
  const preview = usePreview();
  const ride = usePreviewContext(ctx, preview);
  const { rider, riderLoading, riderError, join, session, startGeo, startManual, stop } = ride;
  const hydrated = useHydrated();
  const reducedMotion = useReducedMotion();
  const { data: leaderboard } = useLeaderboard();
  const { data: vehicles } = useVehicles();
  const pos = useRiderPosition({ riding: session.active, reducedMotion });
  const snapshotRef = useRef(pos.snapshot);
  useEffect(() => {
    snapshotRef.current = pos.snapshot;
  }, [pos.snapshot]);
  const hereForDemo = useCallback(() => snapshotRef.current, []);
  useDemoStepper(rider?.homeTeamRouteId ?? null, hereForDemo);
  const demoSpot = useDemoSpot();
  // The pinned demo spot counts as a real fix, and updates immediately instead of at the 1 Hz snapshot.
  const fixNow = demoSpot ? { lat: demoSpot.lat, lng: demoSpot.lng, heading: demoSpot.heading, accuracy: 10 } : pos.snapshot;
  const nearby = previewNearby(preview, useNearbyStation(fixNow, pos.gpsState === "on" || demoSpot !== null));

  const [manualOpen, setManualOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [dismissedResult, setDismissedResult] = useState<object | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const team = rider?.homeTeamRouteId ?? null;
  const teamStats = leaderboard?.teams.find((t) => t.teamRouteId === team) ?? null;
  const nearest = nearestPlace(fixNow);
  const { data: hotspotData } = useHotspots(rider?.riderId ?? null);
  const fixKey = `${fixNow.lat.toFixed(5)},${fixNow.lng.toFixed(5)},${fixNow.heading == null ? "" : Math.round(fixNow.heading / 15)}`;
  const rideLine = session.active ? (session.teamRouteId ?? null) : null;
  const nextStopId = session.active ? (session.nextStopId ?? null) : null;
  const strip = useMemo(
    () => deriveRouteStrip({ fix: fixNow, demo: demoSpot, rideLine, nextStopId, homeTeam: rider?.homeTeamRouteId ?? null }),
    // fixNow is bucketed through fixKey so the strip only re-derives when the rider actually moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixKey, demoSpot, rideLine, nextStopId, rider?.homeTeamRouteId],
  );
  const showSummary = !session.active && session.lastResult !== null && session.lastResult !== dismissedResult;

  const phase: Phase = !hydrated || riderLoading ? "loading" : !rider ? "join" : session.active ? "live" : showSummary ? "summary" : "idle";
  const error = session.error && session.error !== dismissedError ? session.error : null;

  const end = async () => {
    setEnding(true);
    try {
      await stop();
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="screen-bleed" style={{ overflow: "hidden" }}>
      <h1 className="visually-hidden">Ride</h1>
      <DemoAwardPop />
      <NavMap
        getFix={pos.getFix}
        team={team}
        mode={MAP_MODE[phase]}
        anchorY={ANCHOR[phase]}
        vehicles={vehicles?.vehicles ?? []}
        nearestId={nearest?.id ?? null}
        reducedMotion={reducedMotion}
        labelMinY={LABEL_TOP[phase]}
      />
      {/* Legibility scrim behind the floating controls. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: phase === "idle" ? "48%" : "34%",
          background: "linear-gradient(to top, rgba(233,220,196,0.96) 16%, rgba(233,220,196,0))",
          pointerEvents: "none",
          transition: "height 400ms var(--ease-out)",
        }}
      />

      {phase !== "join" ? (
        <div className={styles.topStack}>
          <TopCard
            name={rider?.displayName ?? (phase === "loading" ? "…" : null)}
            team={team}
            teamStats={teamStats}
            active={session.active}
            state={session.state}
            gpsState={pos.gpsState}
            accuracy={pos.snapshot.accuracy}
            simulated={demoSpot !== null}
            onRequestGps={pos.requestGps}
            canRequestGps={!USE_MOCKS && (pos.gpsState === "off" || pos.gpsState === "locating")}
          />
          {error ? (
            <ErrorToast
              message={error}
              onDismiss={() => setDismissedError(error)}
              onPickStop={session.active || !rider ? undefined : () => setManualOpen(true)}
            />
          ) : null}
          {strip && (phase === "idle" || phase === "live") ? (
            <LivingRouteCard strip={strip} hotspots={hotspotData?.hotspots ?? []} riding={session.active} />
          ) : null}
        </div>
      ) : null}

      {phase === "join" ? <JoinCard onJoin={join} loading={riderLoading} error={riderError} /> : null}

      {phase === "idle" ? (
        <IdleDock team={team} nearby={nearby} onStart={startGeo} onPickStop={() => setManualOpen(true)}>
          <NextTrainTimer stopId={nearest?.id ?? null} />
        </IdleDock>
      ) : null}

      {phase === "live" ? (
        <LivePanel
          team={session.teamRouteId ?? team}
          homeTeam={team}
          state={session.state}
          startedAt={session.startedAt}
          stopsCredited={session.stopsCredited}
          minutesRidden={session.minutesRidden}
          pointsAwarded={session.pointsAwarded}
          crew={session.crew}
          sideQuest={session.sideQuest}
          message={session.message}
          teamStats={teamStats}
          onEnd={end}
          ending={ending}
        />
      ) : null}

      {phase === "summary" && session.lastResult ? (
        <SummaryCard
          team={team}
          stopsCredited={session.lastResult.stopsCredited}
          pointsAwarded={session.lastResult.pointsAwarded}
          durationMs={session.lastResult.durationMs}
          onDismiss={() => setDismissedResult(session.lastResult)}
        />
      ) : null}

      {team ? (
        <ManualPickSheet
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          defaultTeam={team}
          near={pos.snapshot}
          onConfirm={startManual}
        />
      ) : null}
    </div>
  );
}
