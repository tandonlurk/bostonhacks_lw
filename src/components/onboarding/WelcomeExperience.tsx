"use client";

import { useEffect, useRef, useState } from "react";
import { OnboardingFlow } from "./OnboardingFlow";
import styles from "./welcome.module.css";

type Building = [startCol: number, span: number, tall: number];
interface Layer {
  tile: HTMLCanvasElement;
  width: number;
  speed: number; // px per second the layer drifts left
  depth: number; // px the layer shifts with the pointer (bigger = closer)
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function skyline(rand: () => number, cols: number, span: [number, number], tall: [number, number], gap: [number, number]): Building[] {
  const out: Building[] = [];
  for (let x = Math.floor(rand() * 4); x < cols - span[0];) {
    const w = span[0] + Math.floor(rand() * (span[1] - span[0] + 1));
    out.push([x, Math.min(w, cols - x), tall[0] + Math.floor(rand() * (tall[1] - tall[0] + 1))]);
    x += w + gap[0] + Math.floor(rand() * (gap[1] - gap[0] + 1));
  }
  return out;
}

/** The landing page's ASCII city, drawn as three parallax layers (far, mid, near) that drift and follow the pointer. */
function AsciiCity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, dpr = 1, cell = 9, animation = 0, lastDraw = 0;
    let layers: Layer[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const font = (size: number) => `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    // Pre-renders one horizontally tileable strip so each frame is a couple of drawImage calls.
    const strip = (tileWidth: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const tile = document.createElement("canvas");
      tile.width = Math.ceil(tileWidth * dpr);
      tile.height = Math.ceil(height * dpr);
      const g = tile.getContext("2d")!;
      g.scale(dpr, dpr);
      g.textBaseline = "top";
      draw(g);
      return tile;
    };
    const towers = (g: CanvasRenderingContext2D, list: Building[], c: number, base: number, tint: string, fade: number) => {
      const row = c * 1.45;
      g.font = font(c * 1.15);
      list.forEach(([start, span, tall], i) => {
        for (let x = start; x < start + span; x++) {
          for (let y = 0; y < tall; y++) {
            const edge = x === start || x === start + span - 1, roof = y === 0, lit = (x + y + i) % 3 === 0;
            g.fillStyle = `rgba(${tint},${(roof || edge ? 0.95 : lit ? 0.78 : 0.28) * fade})`;
            g.fillText(roof ? "_" : edge ? ":" : lit ? "+" : ".", x * c, base - (tall - y) * row);
          }
        }
        if (tall > 20) {
          const mid = start + Math.floor(span / 2);
          g.fillStyle = `rgba(${tint},${0.8 * fade})`;
          for (let y = 1; y <= 4; y++) g.fillText("|", mid * c, base - (tall + y) * row);
          g.fillText("+", mid * c, base - (tall + 5) * row);
        }
      });
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr; canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.min(11, Math.max(7.5, Math.min(width, 1300) / 118));
      const tileWidth = Math.max(width, 900) * 1.3;

      const farCell = cell * 0.6, nearCell = cell * 1.7;
      const far = strip(tileWidth, (g) => towers(g, skyline(seeded(11), Math.floor(tileWidth / farCell), [4, 8], [10, 34], [0, 2]), farCell, height * 0.66, "236,247,253", 0.42));
      const mid = strip(tileWidth, (g) => {
        const cols = Math.floor(tileWidth / cell), row = cell * 1.45, base = height * 0.8;
        towers(g, skyline(seeded(5), cols, [5, 10], [6, 28], [1, 4]), cell, base, "255,255,255", 1);
        g.font = font(cell * 1.15);
        for (let x = 0; x < cols; x++) {
          g.fillStyle = "rgba(255,255,255,.75)"; g.fillText("=", x * cell, base + row * 1.4);
          g.fillStyle = "rgba(255,255,255,.6)"; g.fillText(x % 4 === 0 ? "+" : "-", x * cell, base + row * 3.4);
          g.fillStyle = "rgba(255,255,255,.25)"; if (x % 2 === 0) g.fillText("~", x * cell, base + row * 5.6 + Math.sin(x / 11) * 3);
          g.fillStyle = "rgba(255,255,255,.18)"; if (x % 3 === 0) g.fillText("~", x * cell, base + row * 7.6 + Math.cos(x / 12) * 3);
        }
      });
      const near = strip(tileWidth, (g) => towers(g, skyline(seeded(23), Math.floor(tileWidth / nearCell), [5, 8], [5, 13], [4, 10]), nearCell, height * 1.04, "255,255,255", 1));
      layers = [
        { tile: far, width: tileWidth, speed: 3, depth: 6 },
        { tile: mid, width: tileWidth, speed: 9, depth: 16 },
        { tile: near, width: tileWidth, speed: 24, depth: 34 },
      ];
    };

    const blit = (layer: Layer, t: number) => {
      const off = (((t * layer.speed + pointer.x * layer.depth) % layer.width) + layer.width) % layer.width;
      const dy = pointer.y * layer.depth * 0.3;
      for (let x = -off; x < width; x += layer.width) context.drawImage(layer.tile, x, dy, layer.width, height);
    };

    const draw = (t: number) => {
      context.clearRect(0, 0, width, height);
      context.textBaseline = "top";
      // sky: twinkling stars and a drifting cloud
      context.font = font(cell * 1.15);
      [[0.12, 0.08], [0.31, 0.04], [0.55, 0.11], [0.74, 0.06], [0.9, 0.17], [0.04, 0.27], [0.43, 0.22], [0.66, 0.3]].forEach(([x, y], i) => {
        context.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 1.6 + i * 1.7) * 0.25})`;
        context.fillText(i % 3 ? "+" : "*", x * width + pointer.x * 3, y * height + pointer.y * 2);
      });
      const cloudX = ((t * 6) % (width + 260)) - 200 + pointer.x * 4;
      context.fillStyle = "rgba(255,255,255,.45)";
      ["   .--.    ", " .(    ).  ", "(___.__)__)"].forEach((line, i) => context.fillText(line, cloudX, height * 0.14 + i * cell * 1.3));

      blit(layers[0], t);
      // atmospheric haze pushes the far skyline back
      const haze = context.createLinearGradient(0, height * 0.35, 0, height * 0.7);
      haze.addColorStop(0, "rgba(169,212,238,0)");
      haze.addColorStop(1, "rgba(169,212,238,.55)");
      context.fillStyle = haze;
      context.fillRect(0, height * 0.35, width, height * 0.35);

      blit(layers[1], t);
      // overhead line with three stations, riding with the mid layer
      const row = cell * 1.45, ox = pointer.x * 16, oy = pointer.y * 5;
      context.font = font(cell * 1.15);
      for (let x = 12; x < 108; x++) {
        const y = 8 + Math.sin(((x - 12) / 96) * Math.PI) * 9;
        context.fillStyle = "rgba(255,255,255,.55)";
        if (x % 2 === 0) context.fillText("·", x * cell + ox, y * row + oy);
        if (x === 28 || x === 60 || x === 92) { context.fillStyle = "rgba(255,255,255,.9)"; context.fillText("O", x * cell + ox, y * row + oy); }
      }
      // the train runs along the mid track
      const trainX = ((t * 105) % (width + 360)) - 300 + ox;
      context.fillStyle = "rgba(255,255,255,1)";
      ["_______________________", "| [] [] | [] [] | [] [] |", "'--O--O---O--O---O--O--'"].forEach((line, i) => context.fillText(line, trainX, height * 0.8 + row * (i - 1.8) + oy));

      blit(layers[2], t);
    };

    const tick = (now: number) => {
      animation = requestAnimationFrame(tick);
      if (now - lastDraw < 33) return;
      lastDraw = now;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      draw(now / 1000);
    };
    const onPointer = (event: PointerEvent) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const start = () => {
      cancelAnimationFrame(animation);
      build();
      if (motion.matches) draw(0);
      else animation = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(start);
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    motion.addEventListener("change", start);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animation);
      window.removeEventListener("pointermove", onPointer);
      motion.removeEventListener("change", start);
    };
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
        <a href="/welcome" className={styles.logo} aria-label="T*spots home"><span className={styles.logoMark} aria-hidden="true" /></a>
        <div className={styles.headerActions}>
          <button ref={startRef} className={styles.start} onClick={() => setStarted(true)}>Get started</button>
        </div>
      </header>

      <div className={styles.art}><AsciiCity /></div>

      <main className={styles.hero}>
        <h1 className={styles.heroLogo}><span className={styles.srOnly}>T*spots</span></h1>
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
