import { EmptyState } from "@/components/EmptyState";

export default function HuntPage() {
  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>Hunt</h1>
      <EmptyState
        title="No active hunt right now"
        body="When there's a delay near your station, a find-it clue card will show up here. Coming in T10."
      />
    </div>
  );
}
