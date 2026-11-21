#!/usr/bin/env bash
# Smoke-test every API endpoint. Usage: scripts/smoke.sh [baseUrl]   (default http://localhost:3001)
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/smoke.mjs "${1:-http://localhost:3001}"
