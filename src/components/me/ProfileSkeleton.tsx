import s from "./me.module.css";

function Bar({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return <span className={s.skel} style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />;
}

/** Shimmering placeholder in the same shape as the real profile. */
export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" style={{ padding: "8px var(--space-4)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Bar w={140} h={140} r={70} />
        <Bar w={150} h={28} style={{ marginTop: 6 }} />
        <Bar w={210} h={16} />
      </div>
      <Bar w="100%" h={74} r={18} style={{ marginTop: 22 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Bar w={66} h={66} r={33} />
            <Bar w={46} h={10} />
          </div>
        ))}
      </div>
      <Bar w={90} h={20} style={{ marginTop: 28 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {[86, 70, 104, 78].map((w, i) => (
          <Bar key={i} w={w} h={36} r={18} />
        ))}
      </div>
    </div>
  );
}
