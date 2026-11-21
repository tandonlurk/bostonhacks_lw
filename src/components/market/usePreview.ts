"use client";

import { useSyncExternalStore } from "react";
import { USE_MOCKS } from "@/hooks/useMocks";

const noop = () => () => {};

/**
 * Reads demo query params (`?tab=perks`, and in mock mode `?preview=guest|joined`) without useSearchParams,
 * so the page doesn't need a Suspense boundary. Server snapshot is empty.
 */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** Mock-mode only: force the guest or joined view for demos and screenshots. */
export function usePreviewRider(): "guest" | "joined" | null {
  const v = useQueryParam("preview");
  if (!USE_MOCKS) return null;
  return v === "guest" || v === "joined" ? v : null;
}
