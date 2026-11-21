"use client";

import { useSyncExternalStore } from "react";
import { useRider } from "@/hooks/useRider";
import { MeProfile } from "@/components/me/MeProfile";
import { NotJoined } from "@/components/me/NotJoined";
import { ProfileSkeleton } from "@/components/me/ProfileSkeleton";

const noopSubscribe = () => () => {};

export default function MePage() {
  const { rider, loading } = useRider();
  // useRider reads localStorage in its initial state, so server and first client render can disagree.
  // Render the skeleton until hydration is done so the markup always matches.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!hydrated) return <ProfileSkeleton />;
  if (rider) return <MeProfile rider={rider} />;
  if (loading) return <ProfileSkeleton />;
  return <NotJoined />;
}
