"use client";

// Tiny cross-component flag so the floating nav can show a live dot on the Ride button while a ride
// is being tracked, without lifting the whole ride session into context.
import { useSyncExternalStore } from "react";

let live = false;
const listeners = new Set<() => void>();

export function setRideLive(next: boolean) {
  if (next === live) return;
  live = next;
  listeners.forEach((l) => l());
}

export function useRideLive(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => live,
    () => false,
  );
}
