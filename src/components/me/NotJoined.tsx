import Link from "next/link";
import { TEAM_ROUTE_IDS } from "@/contracts/routes";
import { RideIcon } from "@/components/icons";
import { Brownstone, PaperT, StateHouse, TripleDecker } from "@/components/paper/origami";
import { lineVar } from "./team";
import s from "./me.module.css";

/** "No profile yet": a blank rider passport cover waiting to be issued, with the five lines as cut-paper ribbons. */
export function NotJoined() {
  return (
    <div
      className={s.rise}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        padding: "24px var(--space-5) 32px",
        minHeight: "60dvh",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: 200,
          height: 260,
          borderRadius: "6px 12px 12px 6px",
          backgroundColor: "var(--accent)",
          backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.18) 0 10px, transparent 10px), var(--grain)",
          boxShadow: "-4px 0 0 -1px var(--cream-3), var(--shadow-float)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 16px 0 26px",
          color: "#fffaf0",
          overflow: "hidden",
          transform: "rotate(-2deg)",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <PaperT height={36} tint="#c9962b" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Commonwealth of the T
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, letterSpacing: "0.06em" }}>RIDER PASSPORT</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", marginBottom: 6 }}>
          {TEAM_ROUTE_IDS.map((t) => (
            <span key={t} style={{ display: "block", height: 5, borderRadius: 1, background: lineVar(t), boxShadow: "0 1px 0 rgba(0,0,0,0.25)" }} />
          ))}
        </span>
        <span style={{ display: "flex", alignItems: "flex-end", gap: 2, marginBottom: -1 }}>
          <Brownstone height={38} />
          <StateHouse height={48} />
          <TripleDecker height={36} />
        </span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, lineHeight: 1.05, maxWidth: 300, marginTop: 10 }}>
        Your passport starts on the platform
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.45, maxWidth: 300 }}>
        Pick a home line, take a ride, and this page fills up with your points, streaks, stamps, hunts and perks.
      </p>
      <Link href="/" className="paper-btn paper-btn--primary" style={{ marginTop: 6, minHeight: 56, padding: "0 26px", fontSize: 17, fontWeight: 800 }}>
        <RideIcon size={22} weight={2.3} />
        Join on the Ride tab
      </Link>
    </div>
  );
}
