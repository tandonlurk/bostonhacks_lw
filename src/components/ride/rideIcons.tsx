// Ride-screen icons drawn in the same loose, hand-inked style as src/components/icons (24x24,
// round caps, currentColor, decorative unless `title` is passed).
import type { SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
  weight?: number;
}

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

/** Radar sweep: searching for your train. */
export function RadarIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 20.3c-4.6.1-8.3-3.6-8.3-8.2.1-4.6 3.8-8.3 8.4-8.2 4.5 0 8.2 3.7 8.1 8.3" />
      <path d="M12 16.1c-2.3 0-4.1-1.9-4.1-4.2.1-2.2 1.9-4 4.2-4 2.2.1 4 1.9 4 4.1" />
      <path d="M12 12.1c2.6 2.4 5.1 5 7.4 7.7" />
      <path d="M12.1 12h.1" strokeWidth={(p.weight ?? 2.1) + 1.2} />
    </>,
  );
}

/** Tunnel mouth with tracks running in: underground. */
export function TunnelIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M3.4 20.4V12c.1-4.8 3.9-8.5 8.7-8.5 4.7.1 8.5 3.9 8.4 8.6l.1 8.3" />
      <path d="M7.4 20.3v-7.7c0-2.6 2.1-4.7 4.7-4.6 2.5 0 4.5 2.1 4.5 4.6v7.7" />
      <path d="M10.6 20.4l.4-3.3M13.5 20.4l-.4-3.3M10.9 18.6h2.3" />
    </>,
  );
}

/** Four-point sparkle with a little satellite: celebration. */
export function SparkleIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M10.5 3.2c.6 3.9 2 5.4 5.9 6.1-3.9.7-5.3 2.2-5.9 6.1-.7-3.9-2.1-5.4-6-6.1 3.9-.6 5.3-2.2 6-6.1Z" />
      <path d="M17.6 14.3c.3 1.9 1 2.6 2.9 2.9-1.9.4-2.6 1.1-2.9 3-.4-1.9-1.1-2.6-3-3 1.9-.3 2.6-1 3-2.9Z" />
    </>,
  );
}

/** Hand-drawn walking figure: idle / not riding. */
export function WalkIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M13.4 3.3c1 0 1.7.8 1.7 1.7 0 .9-.8 1.7-1.7 1.6-.9 0-1.6-.8-1.6-1.7 0-.9.7-1.6 1.6-1.6Z" />
      <path d="M12.6 8.6 10.9 14l3 2.6.9 4.6" />
      <path d="M11 14.1 9.3 17l-2.7 3.9" />
      <path d="M12.6 8.6c-1.9.6-3.2 1.8-3.9 3.6M12.7 8.7c.9 1.6 2.2 2.6 4 3.1" />
    </>,
  );
}

/** Four uneven signal bars: GPS strength. */
export function SignalIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M5.2 18.4c.1-1.4 0-2.8.1-4.1M9.7 18.5c0-2.6 0-5.1.1-7.6M14.2 18.4c.1-3.7.1-7.4.1-11.1M18.8 18.5c0-4.9 0-9.7.1-14.6" />
    </>,
  );
}
