// Postgres client (owner: A). Schema lives in db/migrations (A only).
// When DATABASE_URL is unset, hasDb() is false and callers should fall back to memory.
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __tcitySql?: Sql };

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Lazily-created shared client. Throws if DATABASE_URL is missing. */
export function getSql(): Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!globalForDb.__tcitySql) {
    globalForDb.__tcitySql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // safe behind poolers (pgbouncer / Supavisor / Neon pooler)
    });
  }
  return globalForDb.__tcitySql;
}

export async function pingDb(): Promise<"ok" | "unconfigured" | "error"> {
  if (!hasDb()) return "unconfigured";
  try {
    await getSql()`select 1`;
    return "ok";
  } catch (err) {
    console.error("[db] ping failed", err);
    return "error";
  }
}
