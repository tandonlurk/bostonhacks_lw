import { EmptyState } from "@/components/EmptyState";

export default function CityPage() {
  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>City</h1>
      <EmptyState
        title="City view is on its way"
        body="Each line's district will grow here as points come in. Coming in T06."
      />
    </div>
  );
}
