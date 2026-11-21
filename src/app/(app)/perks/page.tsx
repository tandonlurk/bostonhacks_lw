import { EmptyState } from "@/components/EmptyState";

export default function PerksPage() {
  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>Perks</h1>
      <EmptyState
        title="No perks yet"
        body="Redeem CitiTokens for rotating perks here once the catalog lands. Coming in T14."
      />
    </div>
  );
}
