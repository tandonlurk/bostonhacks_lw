"use client";

import { BottomNav } from "./BottomNav";
import { DelayBanner } from "./DelayBanner";
import { useRider } from "@/hooks/useRider";
import { useDelay } from "@/hooks/useDelay";

export function AppShell({ children }: { children: React.ReactNode }) {
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
