// T-City in-house icon set. Drawn by hand as loose marker strokes (slightly wobbly curves,
// round caps) so the app feels made, not stock. Every icon is 24x24, inherits currentColor,
// and is decorative by default (aria-hidden). Pass `title` to make one meaningful on its own.
import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
  /** Stroke weight; nav uses ~2.2, small inline glyphs look better at ~1.8. */
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

/** Skyline: three towers of uneven height with a crooked antenna. */
export function CityIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M3.2 20.6c5.9-.3 11.8-.2 17.7.1" />
      <path d="M4.6 20.4V11.2c0-.6.4-.9 1-.9l3.1.1c.5 0 .8.4.8.9v9" />
      <path d="M9.6 20.4V5.6c0-.6.5-1 1.1-1l3 .2c.5 0 .9.4.9 1l-.1 14.6" />
      <path d="M14.6 20.4v-7.3c0-.5.4-.9.9-.9l2.9.1c.5 0 .9.4.9.9l-.1 7.2" />
      <path d="M12.1 4.5c0-.9.1-1.7.2-2.3" />
      <path d="M11.4 8.1h1.6M11.5 11.2h1.5M6.5 13.4h1M16.3 15.3h1" />
    </>,
  );
}

/** Magnifier over a dotted trail: the hunt. */
export function HuntIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M10.3 3.6c3.8-.2 6.6 2.6 6.5 6.3-.1 3.6-3 6.3-6.6 6.2C6.6 16 4 13.2 4.1 9.8c.1-3.4 2.7-6.1 6.2-6.2Z" />
      <path d="M15.2 15.1c1.6 1.5 3.2 3.1 4.7 4.8" />
      <path d="M7.6 10.9c.6-1.1 1.4-1.9 2.6-2.4" strokeDasharray="0.1 2.4" />
      <path d="M10.4 7.2c.8-.1 1.6.1 2.2.5" />
    </>,
  );
}

/** Front of a T car: rounded cab, two headlights, windshield. */
export function RideIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M6.4 17.1c-.9-.1-1.5-.8-1.5-1.7l.2-9.1C5.2 4.4 6.8 3 8.8 3l6.5.1c2 0 3.6 1.5 3.6 3.4l-.1 9c0 .9-.7 1.6-1.6 1.6-3.6.1-7.2.1-10.8 0Z" />
      <path d="M5.4 10.6c4.4.3 8.9.3 13.3-.1" />
      <path d="M8.3 13.6h.2M15.6 13.5h.2" strokeWidth={(p.weight ?? 2.1) + 1} />
      <path d="M7.6 20.9l1.6-3.6M16.5 20.9 14.8 17.3" />
      <path d="M10.2 5.6c1.2-.1 2.4-.1 3.6 0" />
    </>,
  );
}

/** Gift box with a floppy bow: perks and rewards. */
export function PerkIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M4.2 10.3c5.2-.4 10.4-.4 15.6 0l-.2 9.1c0 .7-.6 1.3-1.3 1.3-4.2.2-8.4.2-12.6 0-.7 0-1.3-.6-1.3-1.3l-.2-9.1Z" />
      <path d="M3.4 7.4c5.7-.4 11.4-.4 17.2 0l-.1 2.9c-5.7.3-11.3.3-17 0l-.1-2.9Z" />
      <path d="M12 7.3v13.2" />
      <path d="M12 7.2C10.6 4.4 7.4 3.7 7.1 5.3 6.9 6.6 9.5 7.2 12 7.2Zm0 0c1.3-2.9 4.6-3.6 4.9-2 .2 1.4-2.4 2-4.9 2Z" />
    </>,
  );
}

/** Round head and shoulders with a little cowlick. */
export function MeIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12.1 3.4c2.3-.1 4 1.7 3.9 4-.1 2.2-1.8 3.9-4 3.9-2.2 0-3.9-1.8-3.9-4 .1-2.2 1.8-3.8 4-3.9Z" />
      <path d="M4.6 20.4c.4-3.8 3.6-6.3 7.5-6.3 3.9.1 6.9 2.6 7.3 6.4" />
      <path d="M11.4 3.5c.3-.6.8-1 1.4-1.2" />
    </>,
  );
}

/** Two people, one slightly behind: Friends. */
export function FriendsIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M9.4 4.6c2-.1 3.4 1.4 3.4 3.4-.1 1.9-1.5 3.4-3.4 3.4-1.9 0-3.4-1.5-3.3-3.4 0-1.9 1.5-3.3 3.3-3.4Z" />
      <path d="M3.2 19.6c.3-3.3 3-5.5 6.3-5.5 3.3.1 5.8 2.3 6.1 5.6" />
      <path d="M15.6 5.3c1.6.2 2.7 1.6 2.6 3.2-.1 1.4-1.1 2.6-2.4 2.9" />
      <path d="M17.4 14.6c2 .6 3.3 2.4 3.5 4.9" />
    </>,
  );
}

/** Coin with a T stamped in it: CitiTokens. */
export function CoinIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 3.3c4.9-.1 8.7 3.8 8.6 8.7-.1 4.8-3.9 8.6-8.7 8.6-4.8 0-8.6-3.9-8.5-8.7.1-4.8 3.9-8.5 8.6-8.6Z" />
      <path d="M8.6 8.6c2.3-.2 4.5-.2 6.8 0M12 8.7l-.1 7.3" />
    </>,
  );
}

/** Trophy cup: leaderboard. */
export function TrophyIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M7.2 4.1c3.2-.2 6.4-.2 9.6 0l-.3 5.4c-.2 2.5-2.1 4.3-4.5 4.3-2.4 0-4.3-1.9-4.5-4.3l-.3-5.4Z" />
      <path d="M7.1 5.6C5 5.3 3.6 6.4 4.1 8.2c.4 1.5 1.9 2.4 3.6 2.4M16.9 5.6c2.1-.4 3.5.8 3 2.6-.4 1.5-1.9 2.3-3.6 2.4" />
      <path d="M12 13.9v3.4M8.3 20.4c.4-1.8 1.9-3 3.7-3 1.8 0 3.3 1.2 3.7 3-2.5.2-4.9.2-7.4 0Z" />
    </>,
  );
}

/** Camera: photo snap mini-game. */
export function CameraIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M4.5 7.6c1.1 0 1.9-.1 2.6-.2l1.4-2.2c3-.2 4.4-.2 7 .1l1.3 2.1c.8.1 1.6.2 2.6.2.7 0 1.2.6 1.2 1.3l-.1 9.2c0 .8-.6 1.3-1.3 1.3-4.9.2-9.8.2-14.6 0-.7 0-1.3-.6-1.3-1.3l-.1-9.2c0-.7.6-1.3 1.3-1.3Z" />
      <path d="M12 9.7c2-.1 3.6 1.5 3.5 3.5 0 2-1.6 3.5-3.6 3.5s-3.5-1.6-3.4-3.6c.1-1.9 1.6-3.4 3.5-3.4Z" />
    </>,
  );
}

/** Puzzle piece: generic mini-game. */
export function PuzzleIcon(p: IconProps) {
  return Svg(
    p,
    <path d="M4.5 8.7c0-.8.6-1.4 1.4-1.4h2.9c-.6-.7-.9-1.4-.8-2.1.1-1.1 1.2-1.9 2.5-1.8 1.3 0 2.3.9 2.3 2 0 .7-.3 1.3-.9 1.9h3c.8 0 1.4.6 1.4 1.4l-.1 2.8c.7-.6 1.3-.8 2-.8 1.2.1 2 1.1 2 2.4 0 1.3-.9 2.3-2.1 2.3-.6 0-1.3-.3-1.9-.9v3c0 .8-.6 1.4-1.4 1.4-3.3.1-6.6.1-9.9 0-.8 0-1.4-.6-1.4-1.4l-.1-9.8Z" />,
  );
}

/** Speech bubble with a question mark: trivia. */
export function TriviaIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12.1 3.6c4.6-.1 8.3 3 8.2 7.1-.1 4-3.8 7-8.4 6.9-1 0-2-.2-2.9-.5L4.6 19.4l1.1-3.6c-1.3-1.3-2-2.9-2-4.7.1-4.1 3.8-7.4 8.4-7.5Z" />
      <path d="M10.1 8.6c.4-1.1 1.2-1.6 2.2-1.6 1.2.1 2 .9 1.9 1.9 0 1.5-2.1 1.6-2.2 3" />
      <path d="M12 14.2h.1" strokeWidth={(p.weight ?? 2.1) + 0.8} />
    </>,
  );
}

/** Lopsided five-point star: landmarks and bonuses. */
export function StarIcon(p: IconProps) {
  return Svg(
    p,
    <path d="M12.1 3.2l2.5 5.2 5.6.7-4.1 3.9 1.1 5.6-5.1-2.8-5 2.7 1-5.6L4 9.1l5.7-.8 2.4-5.1Z" />,
  );
}

/** Stopwatch: ride duration. */
export function ClockIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 5.6c4.2-.1 7.4 3.2 7.4 7.3-.1 4.1-3.4 7.3-7.5 7.3s-7.3-3.3-7.3-7.4c.1-4 3.3-7.2 7.4-7.2Z" />
      <path d="M12 9.2l-.1 3.9 2.6 1.6M10 2.9c1.4-.1 2.7-.1 4.1 0M18.3 5.4l1.3 1.3" />
    </>,
  );
}

/** Lightning bolt: delay / alert. */
export function BoltIcon(p: IconProps) {
  return Svg(p, <path d="M13.4 2.8 5.6 13.5l5.8.1-1.1 7.6 8.1-10.8-5.9-.1 1-7.5Z" />);
}

/** Map pin. */
export function PinIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 21c-3.4-3.9-6.3-7.4-6.2-10.9.1-3.6 2.9-6.4 6.3-6.4 3.5.1 6.2 2.9 6.1 6.5-.1 3.5-2.9 6.9-6.2 10.8Z" />
      <path d="M12 7.9c1.2 0 2.2 1 2.1 2.2 0 1.2-1 2.1-2.2 2.1-1.2-.1-2.1-1-2.1-2.2.1-1.2 1-2.1 2.2-2.1Z" />
    </>,
  );
}

/** Rolled scroll with a seal: bounty board post. */
export function BountyIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M6.6 4.1c3.9-.2 7.8-.2 11.6 0 1.1.1 1.9 1 1.9 2l-.1 1.6h-3.4" />
      <path d="M6.6 4.1c1.1 0 2 .9 2 2l-.1 12.2c0 1.1-.9 1.9-2 1.9h10.3c1.1 0 1.9-.8 1.9-1.9l.1-10.6" />
      <path d="M6.6 4.1c-1.1 0-2 .9-2 2v1.5h4" />
      <path d="M11.2 9.9h4.6M11.2 13.1h3.2" />
      <path d="M14.9 17.5c.7 0 1.3-.6 1.3-1.3s-.6-1.3-1.3-1.3-1.3.6-1.3 1.3.6 1.3 1.3 1.3Z" />
    </>,
  );
}

/** Two arrows swapping: trade. */
export function TradeIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M4.3 8.3c5.1-.2 10.2-.2 15.3.1M15.8 4.6l3.8 3.8-3.7 3.6" />
      <path d="M19.7 15.8c-5.1.2-10.2.2-15.3-.1M8.2 19.6l-3.8-3.8 3.7-3.7" />
    </>,
  );
}

/** Flame: streaks. */
export function FlameIcon(p: IconProps) {
  return Svg(
    p,
    <path d="M12.2 21c-3.8 0-6.6-2.7-6.4-6.3.1-3.1 2.2-4.6 3.4-7.4.6 1.5.8 2.6.5 3.8 1.8-1.7 2.9-4.2 2.4-7.4 3.9 2.6 6.4 6.2 6.2 10.3-.1 4-2.6 7-6.1 7Z" />,
  );
}

/** Plus sign. */
export function PlusIcon(p: IconProps) {
  return Svg(p, <path d="M12.1 4.6c-.1 5-.1 9.9 0 14.8M4.6 12c5-.1 9.9-.1 14.8.1" />);
}

/** Check mark. */
export function CheckIcon(p: IconProps) {
  return Svg(p, <path d="M4.6 12.8c1.6 1.3 3.1 2.9 4.5 4.6 3.1-4.4 6.4-8.3 10.3-11.6" />);
}

/** Close / dismiss. */
export function CloseIcon(p: IconProps) {
  return Svg(p, <path d="M5.6 5.7c4.3 4.1 8.5 8.3 12.7 12.6M18.4 5.6c-4.2 4.3-8.5 8.5-12.8 12.7" />);
}

/** Chevron pointing right. */
export function ChevronIcon(p: IconProps) {
  return Svg(p, <path d="M9.3 5.2c2.4 2.2 4.6 4.5 6.7 6.9-2.1 2.3-4.3 4.6-6.7 6.8" />);
}

/** Crosshair: recenter on me. */
export function LocateIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M12 5.3c3.8-.1 6.8 3 6.7 6.8-.1 3.7-3.1 6.6-6.8 6.6-3.7-.1-6.6-3.1-6.6-6.8.1-3.7 3-6.6 6.7-6.6Z" />
      <path d="M12 2.4v2.9M12 18.7v2.9M2.4 12h2.9M18.7 12h2.9" />
    </>,
  );
}

/** Stop square for "end ride". */
export function StopIcon(p: IconProps) {
  return Svg(
    p,
    <path d="M7.4 6.3c3.1-.2 6.1-.2 9.2 0 .6 0 1.1.5 1.1 1.1.2 3.1.2 6.1 0 9.2 0 .6-.5 1.1-1.1 1.1-3.1.2-6.1.2-9.2 0-.6 0-1.1-.5-1.1-1.1-.2-3.1-.2-6.1 0-9.2 0-.6.5-1.1 1.1-1.1Z" />,
  );
}

/** Pencil: edit. */
export function EditIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M4.5 19.6l.7-3.9L15.8 5.2c.8-.8 2-.8 2.8 0l.3.3c.8.8.8 2 0 2.8L8.4 18.8l-3.9.8Z" />
      <path d="M14 7.1l3 2.9" />
    </>,
  );
}

/** Users / team. */
export function TeamIcon(p: IconProps) {
  return Svg(
    p,
    <>
      <path d="M9.1 4.6c1.8-.1 3.2 1.4 3.1 3.2 0 1.8-1.5 3.2-3.2 3.1C7.2 10.9 5.8 9.4 5.9 7.7c0-1.7 1.4-3.1 3.2-3.1Z" />
      <path d="M2.9 19.6c.3-3.3 2.9-5.6 6.2-5.6 3.2 0 5.8 2.3 6.1 5.6" />
      <path d="M15.6 5c1.5.1 2.6 1.4 2.5 2.9-.1 1.4-1.2 2.5-2.6 2.6M17.4 14.2c2.1.6 3.5 2.6 3.7 5.1" />
    </>,
  );
}
