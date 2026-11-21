"use client";

import { BottomNav } from "./BottomNav";
import { DelayBanner } from "./DelayBanner";
import { useRider } from "@/hooks/useRider";
import { useDelay } from "@/hooks/useDelay";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/welcome") return <>{children}</>;
  return <GameShell>{children}</GameShell>;
}

function GameShell({ children }: { children: React.ReactNode }) {
  const { rider } = useRider();
  const delay = useDelay(rider?.homeTeamRouteId);

  return (
    <div className="app-shell" data-delay={delay.active ? "true" : undefined}>
      <DelayBanner delay={delay} />
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}
