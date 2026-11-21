"use client";

import { useEffect, useRef, useState } from "react";
import { StopIcon } from "@/components/icons";
import styles from "./ride.module.css";

const HOLD_MS = 900;

/**
 * Press-and-hold to end a ride (so a pocket tap can't kill it). Keyboard and assistive-tech
 * activation (click with detail 0) ends immediately, since holding isn't possible there.
 */
export function HoldToEnd({ onEnd, busy }: { onEnd: () => void; busy?: boolean }) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 1800);
    return () => clearTimeout(id);
  }, [hint]);

  const label = busy ? "Ending ride…" : holding ? "Keep holding…" : hint ? "Press and hold to end" : "Hold to end ride";

  return (
    <button
      type="button"
      className={styles.hold}
      data-holding={holding}
      disabled={busy}
      aria-label="End ride. Press and hold, or press Enter."
      onPointerDown={(e) => {
        if (busy || e.button !== 0) return;
        fired.current = false;
        setHolding(true);
        timer.current = setTimeout(() => {
          fired.current = true;
          setHolding(false);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
          onEnd();
        }, HOLD_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.detail === 0) {
          onEnd();
          return;
        }
        if (!fired.current) setHint(true);
      }}
    >
      <span className={styles.holdFill} aria-hidden="true" />
      <span className={styles.holdLabel}>
        <StopIcon size={20} weight={2.3} />
        {label}
      </span>
    </button>
  );
}
