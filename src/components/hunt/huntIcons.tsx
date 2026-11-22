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

/** Dot with two broken, wobbly signal arcs either side: a hotspot. */
export function HotspotIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 10.6c.9 0 1.5.7 1.5 1.5s-.7 1.5-1.6 1.4c-.8 0-1.4-.7-1.4-1.5s.7-1.4 1.5-1.4Z" />
      <path d="M8.3 8.2c-1.9 2.2-1.9 5.3.1 7.6" />
      <path d="M15.8 8.3c1.9 2.2 1.9 5.2-.1 7.5" />
      <path d="M5.3 5.4c-3.3 3.8-3.4 9.3-.1 13.3" />
      <path d="M18.8 5.5c3.2 3.8 3.3 9.2 0 13.1" />
    </>,
  );
}

/** Two phones leaning in to touch, with a little spark above where they meet: bump. */
export function BumpIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M3.4 10.3c-.3-.8.1-1.6.9-1.9l3.2-1.2c.8-.3 1.6.1 1.9.9l3 8.1c.3.8-.1 1.6-.9 1.9l-3.2 1.2c-.8.3-1.6-.1-1.9-.9l-3-8.1Z" />
      <path d="M20.6 10.3c.3-.8-.1-1.6-.9-1.9l-3.2-1.2c-.8-.3-1.6.1-1.9.9l-1.2 3.2" />
      <path d="M12.6 17.4l.2.6c.3.8 1.1 1.2 1.9.9l3.2-1.2c.8-.3 1.2-1.1.9-1.9l1.8-5.5" />
      <path d="M12 2.8v2.4" />
      <path d="M8.7 3.7l1.1 1.8" />
      <path d="M15.3 3.7l-1.1 1.8" />
    </>,
  );
}

const WOBBLE_RING =
  "M-0.96,0.05 C-0.99,-0.53 -0.5,-1 0.07,-0.97 C0.6,-0.94 1,-0.5 0.97,0.03 C0.94,0.57 0.5,0.99 -0.05,0.98 C-0.55,0.95 -0.92,0.6 -0.93,0.13";

/** Hand-drawn ring that doesn't quite close, centered on 0,0 with radius ~r. Used for the hotspot map marker. */
export function wobbleRing(r: number) {
  return WOBBLE_RING.replace(/-?\d*\.?\d+/g, (n) => (+n * r).toFixed(2));
}
