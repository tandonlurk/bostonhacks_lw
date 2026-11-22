export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "var(--space-6) var(--space-4)",
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>{title}</p>
      {body ? <p style={{ fontSize: 14 }}>{body}</p> : null}
    </div>
  );
}
