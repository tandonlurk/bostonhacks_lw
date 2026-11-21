"use client";

import { useMemo, useState } from "react";
import { TEAMS, TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import type { Landmark, Vehicle } from "@/contracts";
import { useVehicles } from "@/hooks/useVehicles";
import { useLandmarks } from "@/hooks/useLandmarks";
import { LineChip } from "./LineChip";
import { EmptyState } from "./EmptyState";
import { LandmarkPanel } from "./LandmarkPanel";

/**
 * Rough bounding box around the rapid-transit core (Cambridge/Boston/JP/Airport/Seaport).
 * Good enough for a flat equirectangular projection at this scale — no tile imagery needed.
 */
const BOUNDS = { minLat: 42.28, maxLat: 42.43, minLng: -71.18, maxLng: -70.97 };

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { left: Math.min(98, Math.max(2, x)), top: Math.min(96, Math.max(2, y)) };
}

function VehicleMarker({ vehicle, onSelect }: { vehicle: Vehicle; onSelect: (v: Vehicle) => void }) {
  const { left, top } = project(vehicle.lat, vehicle.lng);
  const color = TEAMS[vehicle.teamRouteId].color;
  return (
    <button
      type="button"
      onClick={() => onSelect(vehicle)}
      aria-label={`${TEAMS[vehicle.teamRouteId].name} vehicle ${vehicle.label}`}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        borderRadius: "50%",
        background: color,
        border: "2px solid var(--surface)",
        boxShadow: "var(--shadow-card)",
        transform: vehicle.bearing != null ? `rotate(${vehicle.bearing}deg)` : undefined,
        transition: "left 0.8s linear, top 0.8s linear",
        padding: 0,
        cursor: "pointer",
      }}
    />
  );
}

function isVehicle(x: Vehicle | Landmark): x is Vehicle {
  return "currentStatus" in x;
}

function LandmarkMarker({ landmark, onSelect }: { landmark: Landmark; onSelect: (l: Landmark) => void }) {
  const { left, top } = project(landmark.lat, landmark.lng);
  return (
    <button
      type="button"
      onClick={() => onSelect(landmark)}
      aria-label={`${landmark.name}${landmark.claimed ? ", claimed" : `, +${landmark.bonusPoints} points`}`}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: 22,
        height: 22,
        marginLeft: -11,
        marginTop: -11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        borderRadius: "50%",
        background: landmark.claimed ? "var(--surface)" : "#caa23a",
        border: "2px solid var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: 0,
        cursor: "pointer",
        opacity: landmark.claimed ? 0.6 : 1,
      }}
    >
      <span aria-hidden="true">★</span>
    </button>
  );
}

export function LiveMap({ riderId = null }: { riderId?: string | null }) {
  const [activeTeams, setActiveTeams] = useState<Set<TeamRouteId>>(new Set(TEAM_ROUTE_IDS));
  const [selected, setSelected] = useState<Vehicle | Landmark | null>(null);
  const { data, loading, error } = useVehicles();
  const { data: landmarks, refresh: refreshLandmarks } = useLandmarks();

  const vehicles = useMemo(
    () => (data?.vehicles ?? []).filter((v) => activeTeams.has(v.teamRouteId)),
    [data, activeTeams],
  );

  function toggleTeam(team: TeamRouteId) {
    setSelected(null);
    setActiveTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "var(--space-3) var(--space-4)",
        }}
      >
        {TEAM_ROUTE_IDS.map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => toggleTeam(team)}
            aria-pressed={activeTeams.has(team)}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              opacity: activeTeams.has(team) ? 1 : 0.35,
              minHeight: "var(--tap-min)",
            }}
          >
            <LineChip teamRouteId={team} size="sm" label="short" />
          </button>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          margin: "0 var(--space-4) var(--space-4)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          background:
            "repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px 40px), var(--surface)",
          minHeight: 320,
        }}
      >
        {loading && !vehicles.length ? (
          <EmptyState title="Finding trains…" body="Loading live vehicle positions." />
        ) : null}

        {!loading && !vehicles.length ? (
          <EmptyState
            title="No vehicles on these lines right now"
            body={error ? `Last error: ${error}` : "Try toggling a different line above."}
          />
        ) : null}

        {vehicles.map((v) => (
          <VehicleMarker key={v.id} vehicle={v} onSelect={setSelected} />
        ))}

        {landmarks.map((l) => (
          <LandmarkMarker key={l.id} landmark={l} onSelect={setSelected} />
        ))}

        {selected && isVehicle(selected) ? (
          <div
            role="status"
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
              padding: "var(--space-3) var(--space-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <LineChip teamRouteId={selected.teamRouteId} size="sm" />
              <p style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
                {selected.routeId} · vehicle {selected.label} ·{" "}
                {selected.currentStatus.replace("_", " ").toLowerCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Dismiss"
              style={{ minHeight: "var(--tap-min)", minWidth: "var(--tap-min)", border: "none", background: "none" }}
            >
              ✕
            </button>
          </div>
        ) : null}

        {selected && !isVehicle(selected) ? (
          <LandmarkPanel
            landmark={selected}
            riderId={riderId}
            onClaimed={refreshLandmarks}
            onDismiss={() => setSelected(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
