"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Ride", icon: "🚆" },
  { href: "/city", label: "City", icon: "🏙️" },
  { href: "/hunt", label: "Hunt", icon: "🔎" },
  { href: "/perks", label: "Perks", icon: "🎁" },
  { href: "/me", label: "Me", icon: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        display: "flex",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        zIndex: 20,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: "var(--tap-min)",
              color: active ? "var(--ink)" : "var(--muted)",
              fontWeight: active ? 700 : 500,
              fontSize: 11,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 20 }}>
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
