"use client";

import { useDistricts } from "@/hooks/useDistricts";
import { DistrictGrid } from "@/components/DistrictGrid";
import { EmptyState } from "@/components/EmptyState";

export default function CityPage() {
  const { data, loading } = useDistricts();

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>City</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: "var(--space-4)" }}>
        Every line&apos;s district grows as riders earn points.
      </p>

      {loading && !data ? <EmptyState title="Loading the city…" /> : null}
      {data?.map((district) => <DistrictGrid key={district.teamRouteId} district={district} />)}
    </div>
  );
}
