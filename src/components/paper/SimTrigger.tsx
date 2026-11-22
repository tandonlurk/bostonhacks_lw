"use client";

// Compact demo-simulation trigger, bottom-left above the nav. It drives the existing hidden arrow-key
// stepper in src/components/ride/demoLocation.ts by dispatching the same key events, so it reuses the
// ride/points logic untouched. The stepper only listens while the Ride screen is mounted, so from other
// tabs we hop to Ride first.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BoltIcon } from "../icons";

const ACTIONS = [
  { key: "ArrowRight", label: "Next stop" },
  { key: "ArrowLeft", label: "Previous stop" },
  { key: "ArrowDown", label: "Switch line" },
  { key: "Escape", label: "Back to real GPS" },
] as const;

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

export function SimTrigger() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const run = (key: string) => {
    if (pathname !== "/") {
      router.push("/");
      window.setTimeout(() => press(key), 450);
    } else press(key);
  };

  return (
    <div className="sim-trigger" ref={ref}>
      <button
        type="button"
        className="paper-btn sim-trigger__fab"
        aria-label="Demo simulation controls"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BoltIcon size={20} weight={2} />
      </button>
      {open && (
        <div className="paper sim-trigger__menu paper-unfold" role="menu" aria-label="Simulate ride">
          <p className="paper-eyebrow" style={{ padding: "2px 6px 4px" }}>
            Simulate
          </p>
          {ACTIONS.map((a) => (
            <button key={a.key} type="button" role="menuitem" className="paper-btn paper-btn--sm paper-btn--ghost" onClick={() => run(a.key)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
