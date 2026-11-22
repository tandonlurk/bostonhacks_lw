"use client";

import { useRef, useState } from "react";
import { OnboardingFlow } from "./OnboardingFlow";
import styles from "./welcome.module.css";
import { BackBayTowers, Brownstone, Citgo, CustomHouse, Fenway, PaperCloud, PaperElm, PaperTree, PaperWaves, StateHouse, SeaportCrane, SwanBoat, TripleDecker, Zakim } from "../paper/origami";

/** Origami Boston skyline for the landing hero (decorative). Built from the shared paper kit. */
function OrigamiSkyline() {
  return (
    <div className={styles.city} aria-hidden="true">
      <div className={styles.skyClouds}>
        <PaperCloud height={22} />
        <PaperCloud height={14} style={{ marginTop: 30 }} />
        <PaperCloud height={18} />
      </div>
      <div className={styles.skyline}>
        <PaperElm height={34} />
        <TripleDecker height={78} tint="#8aa6b8" />
        <Brownstone height={92} />
        <Brownstone height={86} tint="#93503a" />
        <StateHouse height={98} />
        <PaperTree height={40} />
        <CustomHouse height={150} />
        <BackBayTowers height={190} />
        <Citgo height={80} />
        <Fenway height={84} />
        <PaperElm height={30} tint="#4f8a5b" />
        <Zakim height={84} />
        <SeaportCrane height={120} />
      </div>
      <div className={styles.harbor}>
        <PaperWaves height={12} />
        <PaperWaves height={12} />
        <PaperWaves height={12} />
        <SwanBoat height={26} style={{ position: "absolute", left: "38%", top: -14 }} />
      </div>
    </div>
  );
}

export function WelcomeExperience() {
  const [started, setStarted] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  if (started) return <OnboardingFlow onClose={() => { setStarted(false); requestAnimationFrame(() => startRef.current?.focus()); }} />;

  return (
    <div className={styles.welcome}>
      <header className={styles.header}>
        <a href="/welcome" className={styles.logo} aria-label="tspots home"><span className={styles.tMark}>t</span><span>tspots</span></a>
        <div className={styles.headerActions}>
          <button ref={startRef} className={styles.start} onClick={() => setStarted(true)}>Get started</button>
        </div>
      </header>

      <div className={styles.art}><OrigamiSkyline /></div>

      <main className={styles.hero}>
        <h1>tspots<span className={styles.period}>.</span></h1>
        <p className={styles.pitch}>A Community of Commuters</p>
        <button className={styles.heroStart} onClick={() => setStarted(true)}>Let’s make moves</button>
      </main>

      <footer className={styles.footer}>
        <div className={styles.lines} aria-label="Built for the Red, Orange, Blue and Green lines">
          {["#da291c", "#ed8b00", "#003da5", "#00843d"].map(color => <span key={color} style={{ background: color }} />)}
        </div>
      </footer>
    </div>
  );
}
