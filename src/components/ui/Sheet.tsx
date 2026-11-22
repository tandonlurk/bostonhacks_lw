"use client";

import { useEffect } from "react";
import { CloseIcon } from "../icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name; also shown as the sheet heading unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  children: React.ReactNode;
}

/** Instagram-style bottom sheet with a grab handle and scrim. Sits above the floating nav. */
export function Sheet({ open, onClose, title, hideTitle, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, border: "none", background: "rgba(42,36,29,0.42)", animation: "fade-in 200ms" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "86dvh",
          overflowY: "auto",
          margin: "0 auto",
          maxWidth: 520,
          // A sheet of card stock slid up over the screen: cream stock, grain, cut edge, lifted shadow.
          backgroundColor: "var(--cream)",
          backgroundImage: "var(--grain)",
          borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
          border: "1px solid var(--paper-edge)",
          borderBottom: "none",
          boxShadow: "0 -2px 0 var(--cream-3), 0 -14px 30px -12px var(--paper-lift-2)",
          padding: "10px var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom, 0px))",
          animation: "sheet-up 280ms var(--ease-out)",
        }}
      >
        {/* Grab handle drawn as a strip of washi tape. */}
        <div aria-hidden="true" style={{ width: 54, height: 12, margin: "0 auto 10px", background: "rgba(233,214,160,0.85)", backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0 4px, transparent 4px 8px)", clipPath: "polygon(3% 0, 97% 8%, 100% 50%, 96% 100%, 4% 92%, 0 50%)", transform: "rotate(-2deg)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: hideTitle ? 0 : 12 }}>
          {hideTitle ? <span /> : <h2 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "grid",
              placeItems: "center",
              width: "var(--tap-min)",
              height: "var(--tap-min)",
              borderRadius: "50%",
              border: "1px solid var(--paper-edge)",
              background: "var(--cream-2)",
              boxShadow: "var(--shadow-press)",
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
