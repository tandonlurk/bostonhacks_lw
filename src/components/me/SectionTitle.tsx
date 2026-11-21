export function SectionTitle({ id, title, action }: { id: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44, marginBottom: 6 }}>
      <h3 id={id} style={{ fontSize: 19, fontWeight: 800 }}>
        {title}
      </h3>
      {action}
    </div>
  );
}
