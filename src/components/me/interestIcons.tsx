// Hand-drawn interest glyphs for the Me screen. Same language as src/components/icons:
// 24x24, loose marker strokes, round caps, slightly wobbly beziers, currentColor, decorative.
import type { IconProps } from "@/components/icons";

function Doodle({ size = 24, title, weight = 2, ...rest }: IconProps, children: React.ReactNode) {
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

/** Mug with a crooked handle and two curls of steam. */
export function CoffeeIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M4.6 10.1c3.6-.3 7.3-.3 10.9 0l-.4 6.6c-.1 1.9-1.6 3.4-3.5 3.4H8.5c-1.9 0-3.4-1.5-3.5-3.4l-.4-6.6Z" />
      <path d="M15.4 11.4c1.9-.4 3.6.3 3.7 1.9.1 1.7-1.6 2.9-4 2.8" />
      <path d="M8.3 7.4c-.8-1.1.6-1.9-.1-3.2M11.6 7.5c-.8-1.2.7-2 0-3.4" />
    </>,
  );
}

/** Slice of pizza with two pepperoni and a bitten crust. */
export function FoodIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M4.1 6.2c5.3-2.4 10.6-2.4 15.8.1L12.3 20.6 4.1 6.2Z" />
      <path d="M5.4 8.6c4.4-1.9 8.9-1.9 13.2.2" />
      <path d="M10.4 11.1c.7 0 1.2.5 1.2 1.1 0 .7-.6 1.2-1.2 1.2-.7 0-1.2-.6-1.2-1.2.1-.6.6-1.1 1.2-1.1ZM14.3 11.8c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9Z" />
    </>,
  );
}

/** Two beamed eighth notes, leaning a little. */
export function MusicIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M9.1 17.4V6.2c3.4-.9 6.7-1.7 10-2.4v11.3" />
      <path d="M9.1 9.3c3.3-.9 6.6-1.7 10-2.5" />
      <path d="M6.6 15.6c1.4-.1 2.5.8 2.5 1.9 0 1.2-1.2 2.2-2.6 2.2-1.4 0-2.4-.9-2.4-2 .1-1.2 1.1-2.1 2.5-2.1ZM16.6 13.3c1.4 0 2.5.9 2.5 2 0 1.2-1.1 2.1-2.5 2.1s-2.5-.9-2.4-2.1c0-1.1 1-2 2.4-2Z" />
    </>,
  );
}

/** Basketball with its seams. */
export function SportsIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M12.1 3.4c4.8-.1 8.6 3.8 8.5 8.6 0 4.8-3.9 8.6-8.7 8.5-4.7 0-8.5-3.9-8.4-8.7.1-4.7 3.9-8.4 8.6-8.4Z" />
      <path d="M3.6 12.1c5.6-.3 11.2-.3 16.9 0M12 3.5c-.2 5.7-.2 11.3.1 17" />
      <path d="M6.1 5.8c2.5 1.6 3.6 3.8 3.5 6.3-.1 2.4-1.3 4.6-3.6 6.1M18 5.9c-2.4 1.6-3.5 3.8-3.5 6.2.1 2.5 1.3 4.6 3.5 6.1" />
    </>,
  );
}

/** Lumpy paint palette with three paint dabs and a thumb hole. */
export function ArtIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M12.3 3.6c4.6-.1 8.3 3 8.2 6.9-.1 2.3-1.8 3.4-3.6 3.2-1.6-.2-2.7.7-2.3 2.3.5 1.9-.6 4.1-3.2 4.1C7 20.2 3.4 16.6 3.5 12c.1-4.7 4-8.3 8.8-8.4Z" />
      <path d="M8.2 9.1h.1M11.6 7h.1M15.6 8.2h.1M7.6 13.3h.1" strokeWidth={(p.weight ?? 2) + 1.2} />
    </>,
  );
}

/** Columned museum front with a wonky pediment. */
export function MuseumIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M3.4 9.1c2.9-2.2 5.8-4.1 8.7-5.8 3 1.7 5.9 3.6 8.6 5.8-5.8.3-11.5.3-17.3 0Z" />
      <path d="M6.2 11.3l.1 6.4M10.1 11.4v6.3M14 11.3l-.1 6.4M17.9 11.4v6.3" />
      <path d="M3.6 20.3c5.6-.3 11.2-.3 16.8 0M4.6 17.9c4.9-.2 9.9-.2 14.8 0" />
    </>,
  );
}

/** Open book, pages bowing out from the spine. */
export function BooksIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M12 6.8C9.6 5 6.6 4.6 3.4 5.3l.1 12.6c3.1-.6 6-.2 8.5 1.7" />
      <path d="M12 6.8c2.4-1.8 5.4-2.2 8.6-1.5l-.1 12.6c-3.1-.6-6-.2-8.5 1.7V6.8Z" />
      <path d="M6 9.1c1.2-.1 2.4.1 3.5.6M14.6 9.6c1.1-.5 2.3-.6 3.5-.5" />
    </>,
  );
}

/** Laptop with a blinking prompt. */
export function TechIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M5.4 15.6l-.1-8.9c0-.8.6-1.4 1.4-1.4 3.6-.1 7.1-.1 10.6 0 .8 0 1.4.6 1.4 1.4l-.1 8.9" />
      <path d="M2.9 16.2c6.1-.3 12.1-.3 18.2 0-.2 1.5-1.2 2.4-2.6 2.4-4.3.2-8.7.2-13 0-1.4 0-2.4-.9-2.6-2.4Z" />
      <path d="M8.6 9.1l2 1.8-2 1.8M12.4 12.8h2.8" />
    </>,
  );
}

/** Two mountains and a lopsided sun. */
export function OutdoorsIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M2.8 19.6 9.2 8.4l3.9 6.4M10.7 19.7 15.5 11.6l5.8 8" />
      <path d="M2.8 19.6c6.2-.2 12.3-.2 18.5 0" />
      <path d="M17.1 3.6c1.4 0 2.4 1 2.4 2.3 0 1.3-1.1 2.3-2.4 2.3-1.3-.1-2.3-1.1-2.3-2.4.1-1.2 1.1-2.2 2.3-2.2Z" />
    </>,
  );
}

/** Crescent moon with a twinkle: nightlife. */
export function NightlifeIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M14.2 4.2c-3.9.6-6.6 4.4-5.9 8.4.6 3.8 4.1 6.4 7.9 6 1.6-.2 3-.9 4.1-1.9-4.1.2-7.5-2.9-7.6-7-.1-2.2.6-4.1 1.5-5.5Z" />
      <path d="M5.3 4.6v3.7M3.5 6.5h3.6M5.6 15.4l.1 2.3M4.5 16.5h2.3" />
    </>,
  );
}

/** Rounded gamepad with a d-pad and two buttons. */
export function GamingIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M7.4 7.3c3.1-.3 6.1-.3 9.2 0 2.4.2 3.9 2.6 4.3 6.1.4 3-.6 4.8-2.2 4.9-1.5.1-2.4-1.3-3.4-2.6-2.2-.3-4.4-.3-6.6 0-1 1.3-1.9 2.7-3.4 2.6-1.6-.1-2.6-1.9-2.2-4.9.4-3.5 1.9-5.9 4.3-6.1Z" />
      <path d="M7.9 10.4l.1 3.3M6.3 12.1h3.3" />
      <path d="M15.6 11.1h.1M17.4 12.9h.1" strokeWidth={(p.weight ?? 2) + 1.1} />
    </>,
  );
}

/** Instant camera with a flash and a big lens. */
export function PhotoIcon(p: IconProps) {
  return Doodle(
    p,
    <>
      <path d="M5 6.3c4.7-.3 9.4-.3 14.1 0 1 .1 1.7.8 1.7 1.8l-.1 9.6c0 1-.8 1.7-1.7 1.8-4.7.2-9.4.2-14.1 0-.9-.1-1.7-.8-1.7-1.8L3.1 8.1c0-1 .9-1.8 1.9-1.8Z" />
      <path d="M12 9.4c2.1 0 3.7 1.6 3.6 3.6 0 2-1.7 3.6-3.7 3.6-2-.1-3.5-1.7-3.5-3.7.1-1.9 1.7-3.5 3.6-3.5Z" />
      <path d="M6.2 9.1h1.3M15.7 4.1c1.3-.1 2.5-.1 3.7.1" />
    </>,
  );
}
