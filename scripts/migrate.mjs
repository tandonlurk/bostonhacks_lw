// Apply db/migrations/*.sql in order, once each. Usage: npm run db:migrate (reads DATABASE_URL,
// loading .env.local if present).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
const dir = "db/migrations";
try {
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from _migrations`).map((r) => r.name));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const body = readFileSync(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into _migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }
  console.log("migrations up to date");
} finally {
  await sql.end();
}
