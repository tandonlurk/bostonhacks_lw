"use client";

import { useEffect, useRef, useState } from "react";
import { OnboardingFlow } from "./OnboardingFlow";
import styles from "./welcome.module.css";

function AsciiCity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let animation = 0;
    let lastDraw = 0;
    let width = 0;
    let height = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const cell = width / 118;
      const row = cell * 1.45;
      context.font = `${cell * 1.15}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "top";
      const put = (character: string, x: number, y: number, alpha = 0.8) => {
        context.fillStyle = `rgba(255,255,255,${alpha})`;
        context.fillText(character, x * cell, y * row);
      };
      // A city assembled from characters, with a train stitching it together.
      const buildings = [
        [8, 5, 7], [15, 8, 11], [25, 5, 16], [32, 9, 22], [43, 6, 13],
        [51, 10, 28], [63, 6, 19], [71, 9, 14], [82, 6, 23], [90, 10, 11], [102, 7, 8],
      ];
      const base = 39;
      buildings.forEach(([start, span, tall], index) => {
        for (let x = start; x < start + span; x++) {
          for (let y = base - tall; y < base; y++) {
            const edge = x === start || x === start + span - 1;
            const roof = y === base - tall;
            const lit = (x + y + index) % 3 === 0;
            put(roof ? "_" : edge ? ":" : lit ? "+" : ".", x, y, roof || edge ? 0.95 : lit ? 0.78 : 0.28);
          }
        }
        if (tall > 20) {
          for (let y = base - tall - 4; y < base - tall; y++) put("|", start + Math.floor(span / 2), y);
          put("+", start + Math.floor(span / 2), base - tall - 5);
        }
      });
      for (let x = 0; x < 118; x++) {
        put("=", x, 41, 0.75);
        put(x % 4 === 0 ? "+" : "-", x, 44, 0.6);
        if (x % 2 === 0) put("~", x, 47 + Math.sin(x / 11) * 0.35, 0.25);
        if (x % 3 === 0) put("~", x, 50 + Math.cos(x / 12) * 0.35, 0.2);
      }
      for (let x = 12; x < 108; x++) {
        const y = 8 + Math.sin((x - 12) / 96 * Math.PI) * 9;
        if (x % 2 === 0) put("·", x, y, 0.55);
        if (x === 28 || x === 60 || x === 92) put("O", x, y, 0.9);
      }
      const trainX = motion.matches ? 61 : (frame * 0.5) % 150 - 25;
      ["_______________________", "| [] [] | [] [] | [] [] |", "'--O--O---O--O---O--O--'"]
        .forEach((line, i) => [...line].forEach((character, j) => put(character, trainX + j, 38.2 + i, 1)));
      [[19, 7], [39, 4], [77, 7], [101, 15], [5, 23]].forEach(([x, y], index) => {
        put("+", x, y, 0.35 + Math.sin(frame / 14 + index) * 0.18);
      });
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const tick = (time: number) => {
      if (time - lastDraw > 90 && !motion.matches) {
        frame++;
        draw();
        lastDraw = time;
      }
      animation = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    animation = requestAnimationFrame(tick);
    return () => { observer.disconnect(); cancelAnimationFrame(animation); };
  }, []);

  return <canvas className={styles.city} ref={canvasRef} aria-hidden="true" />;
}

export function WelcomeExperience() {
  const [started, setStarted] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  if (started) return <OnboardingFlow onClose={() => { setStarted(false); requestAnimationFrame(() => startRef.current?.focus()); }} />;

  return (
    <div className={styles.welcome}>
      <header className={styles.header}>
        <div className={styles.headerActions}>
          <a href="/welcome" className={styles.logo} aria-label="T-spots home"><span className={styles.tMark}>t</span><span>t-spots</span></a>
          <button ref={startRef} className={styles.start} onClick={() => setStarted(true)}>Get started</button>
        </div>
      </header>

      <div className={styles.art}><AsciiCity /></div>

      <main className={styles.hero}>
        <h1>t-spots<span className={styles.period}>.</span></h1>
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
