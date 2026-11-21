#!/usr/bin/env bash
# One-shot DB cutover: reads DATABASE_URL from .env.local, runs migrations, sets it on Vercel
# (production + development), redeploys prod, then smoke-tests prod.
# Usage: scripts/db-setup.sh            (requires `vercel` CLI logged in and the project linked)
set -euo pipefail
cd "$(dirname "$0")/.."
URL=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
[ -n "$URL" ] || { echo "DATABASE_URL is empty in .env.local"; exit 1; }

echo "== migrations"
DATABASE_URL="$URL" node scripts/migrate.mjs

echo "== vercel env"
for target in production development; do
  vercel env rm DATABASE_URL "$target" --yes >/dev/null 2>&1 || true
  printf '%s' "$URL" | vercel env add DATABASE_URL "$target" >/dev/null
  echo "set DATABASE_URL ($target)"
done

echo "== redeploy production"
vercel deploy --prod --yes >/dev/null
PROD_URL=${PROD_URL:-https://tcity-xi.vercel.app}
curl -s "$PROD_URL/api/health"; echo

echo "== smoke"
node scripts/smoke.mjs "$PROD_URL"
