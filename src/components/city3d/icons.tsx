// City-only icons, drawn in the same loose marker style as src/components/icons (24x24, currentColor, round caps).
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

/** Wobbly orbit arrow around a little cube: rotate the 3D view. */
export function OrbitIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M19.6 9.1c-1.2-3.2-4.2-5.4-7.7-5.3-4.5.1-8.1 3.8-8 8.3" />
      <path d="M19.9 4.6l-.2 4.6-4.5-.4" />
      <path d="M4.4 14.9c1.3 3.1 4.3 5.3 7.8 5.2 4.4-.1 7.9-3.6 8-8" />
      <path d="M9.4 10.4l2.7-1.5 2.6 1.5-.1 3.1-2.6 1.5-2.6-1.5.1-3.1ZM12.1 11.9l-.1 3.1M9.5 10.5l2.6 1.4 2.6-1.4" />
    </>,
  );
}

/** Little skyline under a home roof: reset the camera. */
export function HomeViewIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M3.6 11.2 12 4.1l8.4 7.2" />
      <path d="M6.1 9.4c-.2 3.6-.2 7.2 0 10.7 4 .2 7.9.2 11.8 0 .2-3.5.2-7.1 0-10.6" />
      <path d="M10 20v-4.6c1.3-.2 2.7-.2 4 0V20" />
    </>,
  );
}

/** Up chevron with a little lift, for "expand". */
export function ExpandIcon(p: IconProps) {
  return Svg(p, <path d="M6.2 14.6c1.9-1.9 3.8-3.8 5.8-5.6 2 1.8 3.9 3.7 5.8 5.7" />);
}
