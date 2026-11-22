"use client";

import { BottomNav } from "./BottomNav";
import { DelayBanner } from "./DelayBanner";
import { RideSessionProvider } from "./ride/RideSessionProvider";
import { SimTrigger } from "./paper/SimTrigger";
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
    // RideSessionProvider sits above every tab so an active ride keeps sampling while you browse Hunt/City/etc.
    <RideSessionProvider>
      <div className="app-shell" data-delay={delay.active ? "true" : undefined}>
        <DelayBanner delay={delay} />
        <main className="app-main">{children}</main>
        <SimTrigger />
        <BottomNav />
      </div>
    </RideSessionProvider>
  );
}
