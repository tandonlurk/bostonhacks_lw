// Extra hand-drawn glyphs for the Hunt screen, same loose-marker style as src/components/icons (24x24, currentColor).
import type { IconProps } from "@/components/icons";

function Svg({ size = 24, title, weight = 2.1, ...rest }: IconProps, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Slightly bowed minus: zoom out. */
export function MinusIcon(p: IconProps) {
  return Svg(p, <path d="M5.2 12.3c4.6-.4 9.1-.4 13.6-.1" />);
}

/** Three stacked, wobbly map sheets: legend / layers. */
export function LayersIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12.1 3.7c2.8 1.2 5.5 2.5 8.1 3.9-2.6 1.5-5.3 2.8-8.2 4-2.8-1.2-5.5-2.5-8.1-3.9 2.7-1.5 5.4-2.8 8.2-4Z" />
      <path d="M4.1 12c2.6 1.4 5.2 2.7 7.9 3.9 2.8-1.1 5.5-2.4 8.1-3.8" />
      <path d="M4.2 16.2c2.6 1.4 5.2 2.6 7.8 3.8 2.8-1.1 5.4-2.4 8-3.8" />
    </>,
  );
}

/** Left-leaning arrow: back. */
export function BackIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M19.2 12.2c-4.6-.3-9.3-.3-13.9 0" />
      <path d="M10.4 6.6c-1.8 1.8-3.5 3.6-5.1 5.6 1.6 1.9 3.3 3.7 5.2 5.4" />
    </>,
  );
}

/** Rough frame corners: fit the whole network. */
export function FrameIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M4.3 9.2c-.1-1.6 0-3.1.2-4.6 1.5-.2 3-.2 4.5-.1" />
      <path d="M15.1 4.4c1.5-.1 3 0 4.5.2.2 1.5.2 3 .1 4.5" />
      <path d="M19.7 14.9c.1 1.5 0 3-.2 4.5-1.5.2-3 .2-4.5.1" />
      <path d="M8.9 19.6c-1.5.1-3 0-4.5-.2-.2-1.5-.2-3-.1-4.5" />
    </>,
  );
}

/** Spiral-ish sparkle burst: result celebration. */
export function SparkIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12.1 3.4c.1 2.2.1 4.3-.1 6.4" />
      <path d="M12 14.3c.1 2.1.1 4.2-.1 6.3" />
      <path d="M3.5 12.1c2.1-.1 4.2-.1 6.3.1" />
      <path d="M14.3 11.9c2.1-.1 4.2 0 6.3.2" />
      <path d="M6.2 6.1c1 .9 1.9 1.9 2.7 3M15.1 15.2c.9.9 1.8 1.9 2.6 2.9M17.8 6c-.9 1-1.8 2-2.8 2.9M8.9 15.1c-.9 1-1.8 1.9-2.8 2.8" />
    </>,
  );
}
