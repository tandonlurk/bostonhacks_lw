# T-City *(working name)*

**Your commute builds the city. Delays become quests.**

A mobile-first web game for people riding the MBTA. Riders earn points on trips they already take — each line's riders collectively grow a shared district of a Boston skyline. When a delay hits, the app turns the wait into a quick find-it-in-the-station scavenger hunt. Riders also earn **CitiTokens**, redeemable for rotating perks.

Built at BostonHacks 2026. Primary track: **Transit Gamification**.

**Live demo:** https://tcity-xi.vercel.app

## Core loop

Ride a train → GPS binds to the real vehicle → stops get credited → points grow your line's district → a delay (real or simulated) opens a find-it-in-the-station hunt → hunts and landmarks earn CitiTokens → redeem tokens for perks.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in what you have; everything works with gaps, see below
npm run dev                  # http://localhost:3001 by default; pass -p to use another port
```

Useful scripts:

```bash
npm run typecheck   # next typegen + tsc --noEmit
npm run lint
npm run build
npm run db:migrate  # applies db/migrations/*.sql against DATABASE_URL
npm run test:rides   # offline test of the ride-verification engine
npm run smoke        # hits every API route against a running server
```

### Environment variables (`.env.example`)

| Variable | Needed for | If unset |
|---|---|---|
| `MBTA_API_KEY` | Live vehicle/stop/alert data | Runs keyless with tighter rate limits (see `MBTA_API_KEY` returns 403 — known issue below) |
| `DATABASE_URL` | Persisting riders, rides, points, hunts, perks across server instances | Falls back to in-memory state — fine for one local server, resets on restart, not shared across Vercel instances |
| `GEMINI_API_KEY` | Optional hunt photo-check (P2, not built) | Unused |
| `NEXT_PUBLIC_USE_MOCKS` | Running the UI entirely off `src/contracts/fixtures.ts`, no backend needed | `0` hits real (or stub) API routes |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs where needed | Defaults to `http://localhost:3001` |
| `ADMIN_TOKEN` | Locking down `/api/delay/simulate` and demo-sim controls | Unset = open in dev |

Mock mode is the fastest way to see every screen with no setup:

```bash
NEXT_PUBLIC_USE_MOCKS=1 npm run dev
```

## Demo mode (no real train required)

1. **Seed a lively city:** `curl -X POST localhost:3001/api/demo/sim -H "content-type: application/json" -d '{"action":"start"}'` — simulated riders keep earning points across all five lines, and it replays a cached real Green-B shape so a ride plays back realistically offline.
2. **Fake a delay:** `curl -X POST localhost:3001/api/delay/simulate -H "content-type: application/json" -d '{"teamRouteId":"Green","active":true}'` — the delay banner shows up app-wide, and while the simulator is running every station also gets two virtual practice hunt clues (`demo:` ids, clearly labeled, no physical claims — real physical clues only ever appear once a human has verified them in person).
3. Reset with `{"action":"reset"}`.

For a real ride, the Green Line B branch is the reference route (surface-level, so GPS is reliable) — bind by sending `{lat, lng, accuracy, speed, ts}` to `POST /api/rides/sample` roughly every 10 seconds while riding, or use the in-app manual fallback (pick your line/direction/stop) if GPS can't get a fix underground.

## Project layout and ownership

Three agents, three lanes — see `AGENTS.md` for the full contract-first workflow this repo was built with:

- **Agent A** — platform, MBTA data, ride verification, delay detection, deploy (`src/contracts/**`, `db/**`, `src/server/{mbta,rides,delay}/**`, `.github/**`, `scripts/**`)
- **Agent B** — game logic: points, districts, hunts, landmarks, perks, simulator (`src/server/{points,districts,hunts,landmarks,perks,tokens,sim}/**`, `data/**`)
- **Agent C** — frontend: every screen, map, city view, design (`src/app/(app)/**`, `src/components/**`, `src/styles/**`)

Product spec: `docs/KICKOFF.md`. Backlog: `docs/TASKS.md`. API contract: `docs/CONTRACTS.md`.

## Known issues / in progress

- **No shared Postgres yet** (`DATABASE_URL` unset) — state is in-memory per server instance, which is flaky across multiple Vercel instances. Needs a human to provision a DB (Tiger Data / Neon / Supabase) and set the env var.
- **MBTA API key returns 403** — the app runs keyless with longer cache windows in the meantime; live vehicle data is still functional but updates less often.
- Solana devnet minting, Gemini photo-check, and the Tiger Data delay-heatmap are P2 and not built (cut if time runs out, per `docs/TASKS.md`).
- Station hunt clues ship with `verified: false` and are excluded from the live API until a human has confirmed the exact wording and a safe public vantage point in person — see `data/hunts.json`.

## Team

- Agent A + Agent C: Claude Code
- Agent B: Codex

<!-- TODO (human): add team member names and roles here for Devpost consistency. -->
