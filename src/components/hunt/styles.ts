import type { CSSProperties } from "react";

// Paper button classes (globals.css .paper-btn): folded card that presses down 2px on :active.
// Prefer these classNames; the style objects below remain for <label> file-picker buttons and older call sites.
export const PRIMARY_BTN = "paper-btn paper-btn--primary";
export const SECONDARY_BTN = "paper-btn";

export const primaryButton: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "var(--accent)",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.08)), var(--grain)",
  color: "var(--accent-ink)",
  fontWeight: 700,
  fontSize: 15,
  boxShadow: "0 2px 0 #1f4a2f, 0 4px 8px -2px rgba(47,107,69,0.45)",
};

export const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: "var(--cream)",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(217,201,171,0.18)), var(--grain)",
  color: "var(--ink)",
  fontWeight: 650,
  border: "1px solid var(--paper-edge)",
  boxShadow: "0 2px 0 var(--fold-shadow), 0 3px 6px -2px var(--paper-lift-2)",
};

export const eyebrow: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

/** A sheet of card stock inside a sheet (clue cards, game rows). */
export const paperCard: CSSProperties = {
  position: "relative",
  background: "var(--cream)",
  backgroundImage: "var(--grain)",
  border: "1px solid var(--paper-edge)",
  borderRadius: 6,
  boxShadow: "var(--shadow-card)",
};

/** A kraft well (secondary panels). */
export const kraftWell: CSSProperties = {
  background: "var(--kraft)",
  backgroundImage: "var(--grain)",
  border: "1px solid var(--paper-edge)",
  borderRadius: 6,
  boxShadow: "inset 0 1px 3px rgba(74,52,22,0.12)",
};
