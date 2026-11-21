# Pitch: 3 minutes + 1 minute Q&A

Draft script — timings are targets, practice and adjust. Update after the integration pass once the real demo flow is locked (Sun ~3 AM).

## Before you start

- Start the demo simulator ahead of time so the city isn't empty: `curl -X POST <deployed-url>/api/demo/sim -d '{"action":"start"}' -H "content-type: application/json"`
- Have two tabs/devices ready: one on `/` (ride + map), one on `/city`.
- Know your backup: if live MBTA data is flaky, everything below works purely off the simulator and the mock/demo endpoints — say so confidently rather than apologizing.

## 0:00–0:15 — Hook

"Everyone in this room who's ridden the T has had the exact same experience: stand on a platform, stare at a countdown clock, and wait. That dead time — multiplied across a quarter million daily riders — is the thing we decided to turn into a game."

## 0:15–0:35 — Problem

"Transit apps today tell you *when* your train is coming. None of them give you a reason to actually want to be riding. And when something goes wrong — a delay — the app just tells you to wait longer. That's the worst moment turned into nothing."

## 0:35–2:20 — Demo (the core loop, live)

1. **Join** (`/`, ~15s): "This is T-City. You pick a home line — I'll go Green — and that's your team."
2. **Ride** (~25s): "I start a ride, and the app matches my GPS to a real MBTA vehicle — not just 'near a stop,' the actual train, including staying tracked through tunnels where GPS drops out." *(Show the status badge moving: searching → on vehicle.)*
3. **City grows** (`/city`, ~30s): "Every stop I ride feeds points into my line's shared district — this isn't my city, it's the Green Line's city, built by everyone riding it. Every rider on a line sees the same skyline grow." *(Point at a tier-up if timing allows, or reference the simulator's running riders.)*
4. **Delay → hunt** (~40s): "Now the part we're most proud of. When there's a delay — real or, for the demo, simulated right now — the app doesn't just make you wait. It opens a hunt." *(Trigger the simulate-delay endpoint if not already active; show the orange banner, tap through to the hunt card.)* "Find-it-in-the-station clues, tap to confirm, and you earn CitiTokens along with points."
5. **Perks** (`/perks`, ~20s): "Tokens redeem for rotating perks — real QR code, scan-and-go."
6. **Landmarks** (~10s, if time): "And if you're near a real Boston landmark on your route, you can claim a bonus just for being there."

## 2:20–2:45 — Why this works / impact

"This serves two riders at once: locals who ride the same route every day and want a reason to keep showing up, and tourists who feel disconnected from the city above ground and suddenly have a reason to explore a station instead of just enduring it. And because it's built on real MBTA data with a verified ride engine, it's not a toy — it's tied to trips people are already taking."

## 2:45–3:00 — Close

"Your commute builds the city. Delays become quests. That's T-City."

## Q&A prep (anticipated questions)

- **"How do you prevent cheating / fake rides?"** GPS has to match a real vehicle's position within an accuracy-scaled radius over multiple consecutive samples before a session binds, plus a stationary-phone check, one active session per rider, and a per-hour points cap.
- **"What happens underground where GPS doesn't work?"** The session stays bound to the vehicle in a "tunnel grace" state using the vehicle's own reported stop sequence and predictions, so a few minutes without GPS doesn't drop you.
- **"Is the hunt content made up?"** No — every physical station clue ships `verified: false` and is excluded from the live app until a team member has actually confirmed the wording and a safe public vantage point in person. Nothing physical is invented.
- **"What's not real yet / what would you build next?"** A shared production database (currently in-memory per server), Solana devnet minting for token awards, Gemini-based photo verification for hunts, and a delay heatmap from historical vehicle data.
- **"Why no native app?"** Mobile-first web means zero install friction for a transit rider who wants this working in the next 30 seconds, and HTTPS-on-Vercel gives us phone geolocation without an app store review cycle.

<!-- TODO (human): fill in accomplishments/learnings once the integration pass locks the final demo path, and swap any step above that didn't make the cut. -->
