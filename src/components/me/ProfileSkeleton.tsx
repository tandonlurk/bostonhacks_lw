import s from "./me.module.css";

function Bar({ w, h, r = 4, style }: { w: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return <span className={s.skel} style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />;
}

/** Shimmering placeholder in the same shape as the passport profile. */
export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" style={{ padding: "8px var(--space-4)" }}>
      <Bar w={140} h={22} style={{ marginBottom: 14 }} />
      <div className={s.passport} style={{ padding: 0 }}>
        <Bar w="100%" h={52} r={0} />
        <div style={{ display: "flex", gap: 14, padding: 14 }}>
          <Bar w={106} h={106} r={53} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <Bar w="80%" h={24} />
            <Bar w={96} h={22} />
            <Bar w="60%" h={14} />
          </div>
        </div>
        <Bar w="90%" h={12} style={{ margin: "4px 14px 16px" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
        {[0, 1, 2].map((i) => (
          <Bar key={i} w="100%" h={70} r={6} />
        ))}
      </div>
      <Bar w={90} h={20} style={{ marginTop: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 12, justifyItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <Bar key={i} w={84} h={84} r={42} />
        ))}
      </div>
    </div>
  );
}
