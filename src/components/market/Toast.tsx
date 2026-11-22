"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./market.module.css";

export interface ToastMsg {
  id: number;
  text: string;
  icon?: React.ReactNode;
  tone?: "accent" | "hot" | "plain";
  /** Optional link action, e.g. "Join" -> "/". */
  link?: { href: string; label: string };
}

export function useToast() {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback((t: Omit<ToastMsg, "id">) => {
    seq.current += 1;
    setToast({ ...t, id: seq.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), t.link ? 4200 : 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, dismiss: () => setToast(null) };
}

const TONE_COLOR = { accent: "var(--accent)", hot: "var(--hot)", plain: "var(--faint)" } as const;

/** A paper slip that slides up above the nav, with a colored edge strip for tone (text carries the meaning). */
export function Toast({ toast }: { toast: ToastMsg | null }) {
  return (
    <div aria-live="polite" role="status" style={{ position: "fixed", inset: "auto 0 0 0", pointerEvents: "none", zIndex: 50 }}>
      {toast ? (
        <div
          key={toast.id}
          className={`paper ${s.toast}`}
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(var(--nav-clearance) + 68px)",
            width: "min(360px, calc(100vw - 32px))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 10px 10px 16px",
            borderRadius: 4,
            boxShadow: `inset 5px 0 0 ${TONE_COLOR[toast.tone ?? "plain"]}, var(--shadow-float)`,
            pointerEvents: "auto",
            color: "var(--ink)",
          }}
        >
          {toast.icon ? (
            <span style={{ flex: "none", color: toast.tone === "hot" ? "var(--hot)" : "var(--accent)", display: "grid" }}>{toast.icon}</span>
          ) : null}
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.3, minHeight: 24, display: "flex", alignItems: "center" }}>
            {toast.text}
          </span>
          {toast.link ? (
            <Link href={toast.link.href} className="paper-btn paper-btn--primary paper-btn--sm" style={{ flex: "none", minHeight: 40 }}>
              {toast.link.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
