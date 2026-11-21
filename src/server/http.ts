// Shared route-handler helpers (owner: A). Error shape: docs/CONTRACTS.md.
import { NextResponse } from "next/server";
import type { ApiError } from "@/contracts";

export function json<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function apiError(status: number, code: string, message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Parse a JSON body or throw a 400 HttpError. */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "bad_json", "Request body must be valid JSON.");
  }
}

/** Wrap a handler so thrown HttpErrors (and anything else) become contract-shaped errors. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return apiError(err.status, err.code, err.message);
      console.error("[api] unhandled error", err);
      return apiError(500, "internal", "Something went wrong.");
    }
  };
}

/** Server-side mock switch: route stubs return fixtures when the real backend isn't ready. */
export function useMocks(): boolean {
  return process.env.USE_MOCKS === "1" || process.env.NEXT_PUBLIC_USE_MOCKS === "1";
}

// ---------- rate limiting (per instance, fixed window; good enough for a hackathon) ----------
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Throw a 429 HttpError if `key` exceeded `limit` calls in the current `windowMs` window. */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return;
  }
  b.count++;
  if (b.count > limit) {
    throw new HttpError(429, "rate_limited", `Too many requests. Try again in ${Math.ceil((b.resetAt - now) / 1000)} s.`);
  }
}
