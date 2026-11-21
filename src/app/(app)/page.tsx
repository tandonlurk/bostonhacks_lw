import { LiveMap } from "@/components/LiveMap";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "var(--space-4) var(--space-4) 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>T-City</h1>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Your commute builds the city.</p>
      </header>
      <LiveMap />
    </div>
  );
}
