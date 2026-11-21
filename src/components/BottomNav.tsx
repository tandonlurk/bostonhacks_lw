"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CityIcon, FriendsIcon, HuntIcon, MeIcon, PerkIcon, RideIcon } from "./icons";
import { useRideLive } from "./ui/liveRide";

// Icon-only floating capsule: City, Hunt, Ride (center), Perks, Friends, Me.
// Labels live in aria-label so screen readers still announce each tab.
const SIDE_TABS = {
  left: [
    { href: "/city", label: "City", Icon: CityIcon },
    { href: "/hunt", label: "Hunt", Icon: HuntIcon },
  ],
  right: [
    { href: "/perks", label: "Perks and forum", Icon: PerkIcon },
    { href: "/friends", label: "Friends", Icon: FriendsIcon },
    { href: "/me", label: "Me", Icon: MeIcon },
  ],
} as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const live = useRideLive();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const side = (tabs: (typeof SIDE_TABS)["left" | "right"]) =>
    tabs.map(({ href, label, Icon }) => (
      <Link
        key={href}
        href={href}
        className="nav-item"
        aria-label={label}
        aria-current={isActive(href) ? "page" : undefined}
      >
        <Icon size={27} weight={isActive(href) ? 2.4 : 2} />
      </Link>
    ));

  return (
    <nav aria-label="Primary" className="nav glass">
      {side(SIDE_TABS.left)}
      <Link
        href="/"
        className="nav-ride"
        aria-label={live ? "Ride, tracking now" : "Start ride"}
        aria-current={isActive("/") ? "page" : undefined}
        data-live={live}
      >
        <RideIcon size={34} weight={2.3} />
      </Link>
      {side(SIDE_TABS.right)}
    </nav>
  );
}
