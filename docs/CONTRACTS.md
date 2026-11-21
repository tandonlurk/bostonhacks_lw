# CONTRACTS: API and data shapes (source of truth)

Owner: Agent A writes `src/contracts/` from this doc in T01. Change only via a `type:contract` issue (see AGENTS.md section 5). All times are ISO 8601 UTC. All bodies are JSON. Errors: `{ "error": { "code": "string", "message": "string" } }` with an HTTP status.

## 1. Routes (teams / districts)
Ids are MBTA route ids. Each has a district.

| routeId | name | color | district |
|---|---|---|---|
| Red | Red Line | #DA291C | Kendall / Harvard (innovation) |
| Orange | Orange Line | #ED8B00 | Neighborhoods (JP, South End, Back Bay) |
| Blue | Blue Line | #003DA5 | Harbor and Airport |
| Green | Green Line (B/C/D/E branches mapped to `Green`; never shown split to riders) | #00843D | Fenway and Campuses |
| Silver | Silver Line (SL1-SL5 mapped to `Silver`) | #7C878E | Seaport |

`teamRouteId` is one of `Red|Orange|Blue|Green|Silver`. Branch ids (`Green-B`, `742`) appear only inside vehicle/route data as `routeId`; always also provide `teamRouteId`. Rider-facing text and game data use line names only ("Green Line", not "Green Line B").

## 2. Read endpoints (A)
```
GET /api/health               -> { ok: true, time }
GET /api/routes               -> [{ id, teamRouteId, name, color, districtName }]
GET /api/stops?routeId=Red    -> [{ id, name, lat, lng }]
GET /api/vehicles?teams=Red,Green
 -> { updatedAt, vehicles: [{ id, routeId, teamRouteId, directionId, lat, lng, bearing, speed,
                              currentStatus, stopId, stopSequence, label }] }
GET /api/delay?teamRouteId=Red
 -> { active, source: "alert"|"simulated"|"none", teamRouteIds, message, startedAt }
POST /api/delay/simulate      { teamRouteId, active }  -> same shape as GET /api/delay
GET /api/delay/heatmap?minutes=120          (T18, additive)
 -> { available, updatedAt, windowMinutes,
      stations: [{ stopId, name, lat, lng, teamRouteId, observations, slowShare, avgSpeedMps }] }
   slowShare 0-1 = share of observations of trains heading to that station that were crawling
   (< 1.5 m/s) between stations. available:false + empty stations when there is no DB.
```

## 3. Riders and rides (A)
```
POST /api/riders   { displayName, homeTeamRouteId } -> { riderId }
GET  /api/riders/:id -> { riderId, displayName, homeTeamRouteId, points, tokens, streakDays }

POST /api/rides/sample
  { riderId, lat, lng, accuracy, speed, ts,
    manual?: { routeId, directionId, stopId } }
 -> { state: "searching"|"on_vehicle"|"in_tunnel"|"left",
      sessionId, vehicleId?, teamRouteId?, stopsCredited, nextStopId?, message }

POST /api/rides/end { riderId } -> { sessionId, stopsCredited, pointsAwarded }
```
Ride flow calls B's internal `awardPoints()` (section 6) for each full minute ridden. A does not implement scoring.

## 4. Game endpoints (B)
```
GET /api/leaderboard
 -> { updatedAt, teams: [{ teamRouteId, points, rank, riders }] }

GET /api/districts
 -> [{ teamRouteId, name, totalPoints,
       lots: [{ id, tier: 0-5, points, x, y, kind }] }]

GET /api/hunts?stopId=place-xxx
 -> { huntId, stopId, clues: [{ id, text, verified }] }
POST /api/hunts/complete { riderId, clueId } -> { pointsAwarded, tokensAwarded, alreadyDone }
POST /api/photo-check { clueId, clueText, imageBase64, mimeType }        (A, T17, optional)
 -> { enabled, passed, confidence, reason }   enabled:false => fall back to tap-to-confirm; never awards points

GET /api/landmarks?lat=..&lng=..&radiusM=800
 -> [{ id, name, lat, lng, stopId, bonusPoints, claimed }]
POST /api/landmarks/claim { riderId, landmarkId, lat, lng } -> { pointsAwarded, alreadyClaimed }

GET /api/perks -> [{ id, title, partner, costTokens, remaining, rotatesAt }]
POST /api/perks/redeem { riderId, perkId } -> { redemptionCode, tokensLeft }
GET /api/tokens?riderId=.. -> { balance, ledger: [{ delta, reason, createdAt, txSignature? }] }

POST /api/demo/sim { action: "start"|"stop"|"reset" } -> { running, riders }
```

### 4a. Hunt clue visibility (clarification, #47; no shape changes)
- `GET /api/hunts?stopId=` returns only **human-verified** physical clues by default, so `clues` may be empty. Physical clues with `verified: false` are never returned or completable.
- While the simulator is running (`POST /api/demo/sim {action:"start"}`), each known stop also gets two clearly labeled **virtual demo clues**: ids prefixed `demo:`, `verified: false`, with no physical claims about the station.
- `POST /api/hunts/complete` accepts `demo:` clues only while the simulator is running. The response shape is unchanged: `{ pointsAwarded, tokensAwarded, alreadyDone }`.
- Demo path: start the sim, simulate a delay, and the hunt card shows the virtual clues. UI should label `demo:` clues as demo content.

### 4b. Landmark query semantics

`GET /api/landmarks` accepts optional `riderId`: when supplied, `claimed` reflects that rider's prior claims; omitted means anonymous browsing with `claimed:false`. Omitting both `lat` and `lng` returns the catalog. Supplying both filters by `radiusM` (default 800, positive and at most 10000 meters). Invalid or incomplete coordinates return 400 `invalid_location`; invalid radius returns 400 `invalid_radius`. Claims require a location within the landmark's configured geofence (150 meters in the seed catalog); otherwise return 403 `outside_geofence`. Claiming again at a valid location returns zero points and `alreadyClaimed:true`.

## 4e. Social ride loop (A, #96; additive types in `src/contracts/index.ts`)
```
GET  /api/rides/nearby?lat=..&lng=..&accuracy=..  -> NearbyStationResponse { canStart, radiusM, station, message }
POST /api/rides/start  { riderId, lat, lng, accuracy } -> StartRideResponse { sessionId, state, station, radiusM, message }
     403 not_near_station (message names the nearest station), 409 ride_active (already riding; keep sampling)
POST /api/rides/sample -> as before, plus optional pointsAwarded, originStationId, crew
     409 ride_not_started when there is no ride started with /api/rides/start
PATCH /api/riders/:id  { interests?, avatarDataUrl? } -> Rider (with interests, avatarDataUrl)

GET  /api/hotspots?riderId=..           -> HotspotsResponse
POST /api/hotspots/generate { riderId } -> HotspotsResponse (recompute now; demo button)
POST /api/hotspots/meet { riderId, hotspotId, lat, lng, accuracy?, code? } -> MeetResponse
     poll every 2 s while status is "waiting"

GET  /api/challenges?riderId=..         -> ChallengesResponse (challenges empty when no delay)
POST /api/challenges/submit { riderId, challengeId, imageBase64, mimeType } -> ChallengeSubmitResponse
     409 no_delay when no delay is active
```
- **Ride start gate.** Rides start only from the Start button, and only within `radiusM` (about 300 m plus a little for GPS error) of a station. After that, GPS decides: the ride binds to the train automatically and ends automatically when the rider gets off (`left`). A started ride that never boards expires after 20 minutes.
- **Crew bonus.** Two or more riders on the **same team** bound to the **same vehicle** form a crew. Each gets `crew` in the sample response ("same team" = riders' home team) and a bonus on every minute ridden while the crew lasts (type `co_ride`). The multiplier starts at 3x and decays linearly to 1x over 10 minutes from when the crew formed.
- **Hotspots.** After `tripsNeeded` completed rides with an origin and a destination, the server finds the rider's most frequent trip and picks a station on a different line to the same destination (Green branches count as one line; `viaRouteIds` are line ids like `Green`, `Orange`). Any team can get the same hotspot. Riders with overlapping interests are steered to the same station. Two riders who bump phones (both call `/meet` within about 10 s, within about 150 m of the hotspot) or pair by code each get `meetPoints` (base 10 x 5 = 50). Once per pair per hotspot.
- **Delay photo challenges.** Solo. Open only while `GET /api/delay` is active. Prompts are generic objects, never claims about a specific station. Gemini grades each photo 0-1; a pass awards `round(points x score)`, once per challenge per delay round. Without `GEMINI_API_KEY` grading is off (`enabled:false`) unless the demo simulator is running, which uses a labeled demo grader.
- New `PointEventType`s: `co_ride`, `hotspot_meet`, `challenge`. They are not ride types (no hourly cap) and use the caller's amount.

## 5. Mock mode
`src/contracts/fixtures.ts` exports one realistic fixture per response above. With `NEXT_PUBLIC_USE_MOCKS=1`, C's data hooks return fixtures instead of fetching, so the UI never waits on a backend.

## 6. Scoring rules (B implements in `src/server/points/rules.ts`; tweak by issue only)
| Event | Points |
|---|---|
| Each full minute on a verified ride (bound to a train, incl. underground) | 1 (type `ride_stop`, ref `<sessionId>:min:<n>`) |
| First verified ride of the day | +5 |
| Daily streak | +2 per day, capped at +10 |
| Hunt clue completed | +10 |
| Landmark claimed (once per rider) | bonus from data (default 15) |
| CitiTokens | 1 token per 10 points earned |

Ride points are time-based (#96) so long, stop-dense lines like Green don't out-earn others; stops are still counted (`stopsCredited`) for display only. Points go to the district of the line ridden (`teamRouteId` of the vehicle). Lot tier thresholds (points per lot): 20 / 60 / 140 / 300 / 600. Cap: 60 ride-points per rider per hour (anti-abuse).

Internal function (B exports, A calls): `awardPoints({ riderId, teamRouteId, type, amount, ref })` -> `{ pointsAwarded, tokensAwarded }`. Idempotent per `ref`.

## 7. A endpoint semantics and error codes (docs only; no shape changes)
Errors always use `{ "error": { "code", "message" } }`. `message` is safe to show users.

| Endpoint | Notes | Error codes |
|---|---|---|
| `GET /api/health` | Adds optional `db: "ok"\|"unconfigured"\|"error"` | none |
| `GET /api/vehicles` | `stopId` is the **parent station** (`place-bucen`), matching hunts/landmarks. `speed` m/s or null. CDN-cached about 4 s; poll every 5 s. | 400 `bad_team`, 502 `mbta_unavailable` |
| `GET /api/stops` | `routeId` may be a team (`Green`) or MBTA route (`Green-B`, `742`). Single MBTA route returns travel order. | 400 `missing_route`, `bad_route`, 502 `mbta_unavailable` |
| `POST /api/riders` | 201. `displayName` trimmed, 1-24 chars. | 400 `bad_json`, `bad_name`, `bad_team`, 429 `rate_limited` |
| `GET /api/riders/:id` | `points`, `tokens`, `streakDays` come from B's ledger. | 404 `rider_not_found` |
| `POST /api/rides/sample` | Send about every 10 s. About 3 moving samples (30 s) to bind. `searching` -> `on_vehicle` <-> `in_tunnel` -> `left`. On `left` the server has already ended the session: stop sampling. `message` is user-ready copy. Samples under 3 s apart are ignored (state echoed back). Missing `accuracy` is treated as 1000 m. `manual` binds to the train at or approaching that station; keep sending the hint while the rider has no GPS. | 400 `bad_json`, `bad_rider`, `bad_location`, `bad_manual`; 404 `rider_not_found` (re-join); 429 `rate_limited`; 503 `mbta_unavailable` (retry) |
| `POST /api/rides/end` | Idempotent: after an automatic `left`, returns the last session's totals. `pointsAwarded` includes daily bonuses. | 400 `bad_rider`, 404 `rider_not_found`, `no_ride` |
| `GET /api/delay` | Omit `teamRouteId` to aggregate all lines. Real delays = active MBTA alerts with effect DELAY/SUSPENSION and severity >= 3. Simulated wins over real and auto-expires after 45 min. Not cached. | 400 `bad_team` |
| `POST /api/delay/simulate` | If `ADMIN_TOKEN` is set, requires header `x-admin-token`. | 400 `bad_team`, `bad_active`; 401 `unauthorized`; 429 `rate_limited` |

| `GET /api/rides/nearby` | Not cached. Missing `accuracy` = 1000 m. | 400 `bad_location`, 429 `rate_limited` |
| `POST /api/rides/start` | Radius `300 + min(accuracy, 150)` m around the nearest station. Anywhere while the demo sim runs. A stale earlier ride is closed first. A started ride that never boards ends as `left` after 20 min. | 400 `bad_json`, `bad_rider`, `bad_location`; 403 `not_near_station`; 404 `rider_not_found`; 409 `ride_active`; 429 `rate_limited`; 503 `mbta_unavailable` |
| `POST /api/rides/sample` (#96) | 409 `ride_not_started` when no started ride exists, including after a ride went stale (no samples for 20 min): UI should treat it as "press Start". Crew = riders with the same **home team** bound to the same vehicle and sampled in the last 2 min. | adds 409 `ride_not_started` |
| `POST /api/rides/end` (#96) | `pointsAwarded` includes minute points, daily bonuses and crew bonus. | as above |
| `PATCH /api/riders/:id` | Interests: up to 12, trimmed, lowercased, de-duplicated, 1-24 chars. Avatar: jpeg/png/webp data URL or null. | 400 `bad_interests`, `bad_avatar`; 404 `rider_not_found`; 429 `rate_limited` |
| `GET /api/hotspots`, `POST /api/hotspots/generate` | Needs `HOTSPOT_TRIPS_NEEDED` (default 3) trips; while the sim runs, generate seeds 3 demo trips. Hotspots last 24 h. | 400 `bad_rider`, 404 `rider_not_found`, 429 `rate_limited` |
| `POST /api/hotspots/meet` | Within 150 m of the station (plus up to 100 m for optional `accuracy`); no distance check while the sim runs. At least one of the pair must hold a hotspot at that station. Bump window 10 s, code valid 30 s, poll every 2 s. 50 points each, once per pair per station per UTC day. | 400 `bad_rider`, `bad_hotspot`, `bad_location`, `bad_code`; 403 `not_at_hotspot`, `no_hotspot`; 404 `hotspot_not_found`, `hotspot_expired`, `code_not_found`, `rider_not_found`; 429 `rate_limited` |
| `GET /api/challenges` | `roundId` = `delay-<startedAt UTC minute>` of the all-lines delay; 4 challenges per round, same for everyone. | 429 `rate_limited` |
| `POST /api/challenges/submit` | Pass at score >= 0.6 awards `round(points x score)` (min 1), once per challenge per round; failed grades can be retried. Demo grader when there is no key (or Gemini errors) while the sim runs. 8/min per rider and per IP. | 400 `bad_rider`, `bad_image`; 413 `image_too_large`; 404 `rider_not_found`, `challenge_not_found`; 409 `no_delay`; 429 `rate_limited` |

Any endpoint: 500 `internal` on unexpected errors.
