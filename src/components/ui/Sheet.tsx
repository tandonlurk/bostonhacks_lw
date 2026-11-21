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
        style={{ position: "absolute", inset: 0, border: "none", background: "rgba(0,0,0,0.55)", animation: "fade-in 200ms" }}
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
          background: "var(--surface)",
          borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
          border: "1px solid var(--glass-border)",
          borderBottom: "none",
          padding: "10px var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom, 0px))",
          animation: "sheet-up 280ms var(--ease-out)",
        }}
      >
        <div aria-hidden="true" style={{ width: 40, height: 5, borderRadius: 3, background: "var(--surface-3)", margin: "0 auto 10px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: hideTitle ? 0 : 12 }}>
          {hideTitle ? <span /> : <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2>}
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
              border: "none",
              background: "var(--surface-2)",
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
