export function TokenWallet({ balance }: { balance: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      <span aria-hidden="true">🪙</span>
      {balance ?? "—"} CitiTokens
    </span>
  );
}
