// Paper UI primitives for the "Living Paper Boston" look (docs/design.md section 3).
// Thin wrappers over the .paper* classes in globals.css so screens share one visual language.
// Every primitive accepts className/style so screens can position or tint it.
import type { CSSProperties, ElementType, HTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Tilt = "l" | "r" | undefined;

export interface PaperCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** Dog-eared top-right corner. */
  fold?: boolean;
  /** Offset sheet peeking out behind (layered stack). */
  stack?: boolean;
  /** Kraft board instead of cream card stock. */
  kraft?: boolean;
  /** Subtle diagonal crease. */
  crease?: boolean;
  /** Hand-placed tilt (noticeboard). */
  tilt?: Tilt;
  /** Fold-in entrance animation. */
  unfold?: boolean;
}

export function PaperCard({ as: Tag = "div", fold, stack, kraft, crease, tilt, unfold, className, ...rest }: PaperCardProps) {
  const cls = [
    "paper",
    fold && "paper--fold",
    stack && "paper--stack",
    kraft && "paper--kraft",
    crease && "paper--crease",
    tilt && `paper--tilt-${tilt}`,
    unfold && "paper-unfold",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={cls} {...rest} />;
}

export interface PaperButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "md" | "sm";
}

export function PaperButton({ variant = "default", size = "md", className, type = "button", ...rest }: PaperButtonProps) {
  const cls = ["paper-btn", variant !== "default" && `paper-btn--${variant}`, size === "sm" && "paper-btn--sm", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={cls} {...rest} />;
}

/** Washi tape strip. Place inside a position:relative parent. */
export function Tape({ style, rotate = -6, color }: { style?: CSSProperties; rotate?: number; color?: string }) {
  return (
    <span
      aria-hidden
      className="paper-tape"
      style={{ top: -8, left: "50%", marginLeft: -32, transform: `rotate(${rotate}deg)`, ...(color ? { background: color } : null), ...style }}
    />
  );
}

/** Push pin. Place inside a position:relative parent. */
export function Pin({ color, style }: { color?: string; style?: CSSProperties }) {
  return <span aria-hidden className="paper-pin" style={{ top: 6, left: "50%", marginLeft: -7, ...(color ? ({ "--pin": color } as CSSProperties) : null), ...style }} />;
}

/** Rubber-stamp label ("VERIFIED", "CLAIMED", "+20"). */
export function Stamp({ children, color, rotate = -4, className, style }: { children: ReactNode; color?: string; rotate?: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={["paper-stamp", className].filter(Boolean).join(" ")} style={{ color, transform: `rotate(${rotate}deg)`, ...style }}>
      {children}
    </span>
  );
}

/** Punched luggage-tag badge. `tone` sets background and ink together. */
export function PaperBadge({ children, bg, ink, className, style }: { children: ReactNode; bg?: string; ink?: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={["paper-badge", className].filter(Boolean).join(" ")} style={{ ...(bg ? { "--badge-bg": bg } : null), ...(ink ? { "--badge-ink": ink } : null), ...style } as CSSProperties}>
      {children}
    </span>
  );
}

/** Uppercase eyebrow heading in the display face. */
export function Eyebrow({ children, as: Tag = "p", className, style }: { children: ReactNode; as?: ElementType; className?: string; style?: CSSProperties }) {
  return (
    <Tag className={["paper-eyebrow", className].filter(Boolean).join(" ")} style={style}>
      {children}
    </Tag>
  );
}
