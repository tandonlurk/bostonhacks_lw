/** Big bold title row used by scrolling screens (Me, Perks). Map screens float their own glass headers. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="screen-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05 }}>{title}</h1>
        {subtitle ? <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
