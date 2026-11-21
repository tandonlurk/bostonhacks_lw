"use client";

// Device-local profile bits for the Me screen (avatar, interests, bio). localStorage is the source of truth on
// this device; avatar + interests are also pushed to A's PATCH /api/riders/:id (#94/#98, interests drive hotspot
// matching) in the background. Push failures (endpoint not deployed, offline) are ignored on purpose.
// Every read/write is wrapped in try/catch (private windows, quota errors, blocked storage).
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Rider, UpdateRiderRequest } from "@/contracts";
import { USE_MOCKS } from "./useMocks";
import { RIDER_ID_KEY } from "./useRider";

export const AVATAR_KEY = "tcity.avatar";
export const INTERESTS_KEY = "tcity.interests";
export const BIO_KEY = "tcity.bio";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false when the browser refused the write (quota, private mode). */
function write(key: string, value: string | null): boolean {
  let ok = true;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    ok = false;
  }
  listeners.forEach((l) => l());
  return ok;
}

/** Fire-and-forget sync of profile fields to the rider record. */
function pushToServer(patch: UpdateRiderRequest) {
  if (USE_MOCKS) return;
  const riderId = read(RIDER_ID_KEY);
  if (!riderId) return;
  fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

/** Reactive localStorage string. Server render and first client render both see `null`. */
function useProfileString(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = useCallback((next: string | null) => write(key, next), [key]);
  return [value, set] as const;
}

/** Profile picture as a ~256px JPEG data URL, or null for the illustrated default. */
export function useProfileAvatar() {
  const [value, setLocal] = useProfileString(AVATAR_KEY);
  const set = useCallback(
    (next: string | null) => {
      const ok = setLocal(next);
      pushToServer({ avatarDataUrl: next });
      return ok;
    },
    [setLocal],
  );
  return [value, set] as const;
}

export function useProfileBio() {
  return useProfileString(BIO_KEY);
}

/** Selected interest ids (see src/components/me/interests.tsx). */
export function useProfileInterests() {
  const [raw, setRaw] = useProfileString(INTERESTS_KEY);
  const interests = useMemo<string[]>(() => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [raw]);
  const setInterests = useCallback(
    (next: string[]) => {
      const ok = setRaw(JSON.stringify(next));
      pushToServer({ interests: next });
      return ok;
    },
    [setRaw],
  );
  return [interests, setInterests] as const;
}

/**
 * New device / cleared storage: seed local avatar + interests from the rider record when the server has them.
 * Never overwrites values already on this device.
 */
export function useSeedProfileFromRider(rider: Rider | null) {
  useEffect(() => {
    if (!rider) return;
    if (rider.avatarDataUrl && read(AVATAR_KEY) === null) write(AVATAR_KEY, rider.avatarDataUrl);
    if (rider.interests?.length && read(INTERESTS_KEY) === null) write(INTERESTS_KEY, JSON.stringify(rider.interests));
  }, [rider]);
}
