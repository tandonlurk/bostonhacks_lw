"use client";

// Device-local profile bits for the Me screen (avatar, interests, bio). They live in localStorage only:
// there is no profile endpoint yet. Optional backend sync is requested in issue #94.
// Every read/write is wrapped in try/catch (private windows, quota errors, blocked storage).
import { useCallback, useMemo, useSyncExternalStore } from "react";

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
  return useProfileString(AVATAR_KEY);
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
  const setInterests = useCallback((next: string[]) => setRaw(JSON.stringify(next)), [setRaw]);
  return [interests, setInterests] as const;
}
