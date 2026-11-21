"use client";

import { useState } from "react";
import { useHunt, readLastStopId } from "@/hooks/useHunt";
import { useRider } from "@/hooks/useRider";
import { HuntCard } from "@/components/HuntCard";
import { EmptyState } from "@/components/EmptyState";

export default function HuntPage() {
  const { rider } = useRider();
  const [stopId] = useState(readLastStopId);
  const { data, loading } = useHunt(stopId);

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>Hunt</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: "var(--space-4)" }}>
        Find-it-in-the-station clues for your current stop.
      </p>

      {loading && !data ? <EmptyState title="Looking for a hunt…" /> : null}
      {!loading && !data?.clues.length ? (
        <EmptyState
          title="No active hunt right now"
          body="Verified clues show up here when there's a delay near your station. Start the demo simulator from the admin tools for a practice run."
        />
      ) : null}
      {data?.clues.length ? <HuntCard hunt={data} riderId={rider?.riderId ?? null} /> : null}
    </div>
  );
}
