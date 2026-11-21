import type { CSSProperties } from "react";

export const primaryButton: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 44,
  padding: "0 18px",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontWeight: 800,
  fontSize: 14,
};

export const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: "var(--surface-3)",
  color: "var(--ink)",
  fontWeight: 700,
  border: "1px solid var(--glass-border)",
};

export const eyebrow: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontFamily: "var(--font-body)",
};
