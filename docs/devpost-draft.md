# Devpost draft

Draft, written before feature freeze — re-read and update after every milestone, finalize during the Sun 2:30–6:00 AM integration pass. Submit before **9:00 AM ET Sunday Nov 22** and confirm the status reads **Submitted**, not Draft.

## Submission checklist (human — do these, Devpost needs them directly)

- [ ] Final project name (currently "T-City", a working name — pick or confirm before submitting)
- [ ] 1-minute demo video (script in `docs/pitch.md`), uploaded wherever Devpost wants it (YouTube unlisted is fine)
- [ ] Team member list — **all members**, with roles
- [ ] Public GitHub repo link: `https://github.com/tandonlurk/bostonhacks_lw` (already public ✓)
- [ ] Live deploy link: `https://tcity-xi.vercel.app`
- [ ] Opt in to the SpaceXSI raffle **only if** the Cursor + Grok Bot requirement in `docs/HUMANS.md` section 0 was actually met — don't claim tool use that didn't happen
- [ ] GoDaddy domain, if registered, added as an extra link
- [ ] Confirm submission status says **Submitted**

## Project name

T-City *(working name — confirm final name before submitting)*

## Tagline

Your commute builds the city. Delays become quests.

## Inspiration

<!-- TODO (human): the personal/team story — why this idea, what MBTA-riding frustration or observation sparked it. This is the part an AI can't write authentically; keep it short and specific. -->

Riding the T is dead time for riders and background noise for the city — this project turns the ride itself into the game, and turns a delay (the worst part of transit) into the best part: a quick, real find-it-in-the-station hunt instead of a dead wait.

## What it does

- **Teams = lines.** Pick a home line (Red, Orange, Blue, Green, or Silver) when you join.
- **Ride, earn points.** Start a ride, and the app matches your phone's GPS to a real MBTA vehicle (with a "tunnel grace" period so going underground doesn't drop your session, plus a manual fallback if GPS can't get a fix). Each credited stop, your first ride of the day, and daily streaks all earn points for your line's shared district.
- **Watch the city grow.** Every line has a district of a shared Boston skyline (Red → Kendall/Harvard innovation, Orange → JP/South End/Back Bay, Blue → Harbor and Airport, Green → Fenway and campuses, Silver → Seaport). Points tier up buildings — all riders on a line see the same shared city grow together.
- **Delays become quests.** When there's a real delay (or you flip the demo switch), a find-it-in-the-station hunt opens for your stop — a couple of quick, verifiable clues, tap to confirm.
- **CitiTokens and perks.** Hunts, landmarks, and rides earn CitiTokens alongside points, redeemable for a small rotating catalog of perks with a QR-code redeem flow.
- **Landmarks.** Claim nearby real Boston landmarks (Boston Common, the Public Garden, Fenway Park, and more) for bonus points when you're actually there.
- **Live leaderboard** across all five lines.
- **Works with zero real trains in the room** — a built-in simulator plays back a real route shape and keeps simulated riders scoring, so the demo doesn't depend on anyone actually being on the T.

## How we built it

Next.js (App Router, TypeScript) on Vercel, three agents working contract-first from a shared `docs/CONTRACTS.md` against generated fixtures so no one was ever blocked on anyone else's endpoint:

- **Platform & ride engine:** server-cached MBTA V3 API client (vehicles/routes/stops/alerts), GPS-to-vehicle ride verification with accuracy-scaled matching and tunnel grace, delay detection from real alerts plus a simulate switch.
- **Game logic:** an atomic points ledger, per-line district/lot tiering, hunts (human-verified physical clues plus clearly-labeled virtual practice clues while the demo simulator runs), geofenced landmark claims, CitiToken ledger and rotating perks.
- **Frontend:** mobile-first app shell, a dependency-free live vehicle map (flat equirectangular projection, no map-tile library needed), the ride/join flow, the animated city view, delay banner and hunt card, landmark claim flow, and the perks/redeem flow with a real scannable QR code.

<!-- TODO (human): name the actual AI tools/models used per lane for the SpaceXSI write-up, matching what docs/HUMANS.md section 0 requires. -->

## Challenges we ran into

- GPS is unreliable underground — the ride-verification engine has to stay bound to a vehicle through tunnel gaps using its reported stop sequence/predictions rather than raw GPS.
- Running three agents against one contract without stepping on each other's files — solved with a strict file-ownership map (`AGENTS.md`), fixtures-first development, and a single coordination-log issue for handoffs.
- Physical hunt clues can't be invented — they only ship once a human has verified the exact wording and a safe public vantage point at the actual station, so the content pipeline had to support "draft now, verify later, never fake it."

## Accomplishments we're proud of

<!-- TODO (human): pick 2-3 concrete, true highlights — e.g. a real test ride binding correctly, the city visibly growing in the demo, the full ride→points→city→delay→hunt→perk loop working end to end. -->

## What we learned

<!-- TODO (human) -->

## What's next

- Shared Postgres in production (currently in-memory, flaky across multiple server instances)
- Solana devnet minting for CitiToken awards (kept as a toggle behind the points ledger)
- Gemini photo verification for hunt clues
- A Tiger Data vehicle-position history and delay heatmap

## Built with

Next.js, TypeScript, React, Vercel, MBTA V3 API, Postgres, `qrcode-generator`

## Try it out

- Live app: https://tcity-xi.vercel.app
- Repo: https://github.com/tandonlurk/bostonhacks_lw
- Demo mode (no real train needed): see the README's "Demo mode" section
