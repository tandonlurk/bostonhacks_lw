# CONTRACTS: API and data shapes (source of truth)

Owner: Agent A writes `src/contracts/` from this doc in T01. Change only via a `type:contract` issue (see AGENTS.md section 5). All times are ISO 8601 UTC. All bodies are JSON. Errors: `{ "error": { "code": "string", "message": "string" } }` with an HTTP status.

## 1. Routes (teams / districts)
Ids are MBTA route ids. Each has a district.

| routeId | name | color | district |
|---|---|---|---|
| Red | Red Line | #DA291C | Kendall / Harvard (innovation) |
| Orange | Orange Line | #ED8B00 | Neighborhoods (JP, South End, Back Bay) |
| Blue | Blue Line | #003DA5 | Harbor and Airport |
| Green | Green Line (B/C/D/E branches mapped to `Green`) | #00843D | Fenway and Campuses |
| Silver | Silver Line (SL1-SL5 mapped to `Silver`) | #7C878E | Seaport |

`teamRouteId` is one of `Red|Orange|Blue|Green|Silver`. Branch ids (`Green-B`) appear only inside vehicle data as `routeId`; always also provide `teamRouteId`.

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
Ride flow calls B's internal `awardPoints()` (section 6) when stops are credited. A does not implement scoring.

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

GET /api/landmarks?lat=..&lng=..&radiusM=800
 -> [{ id, name, lat, lng, stopId, bonusPoints, claimed }]
POST /api/landmarks/claim { riderId, landmarkId, lat, lng } -> { pointsAwarded, alreadyClaimed }

GET /api/perks -> [{ id, title, partner, costTokens, remaining, rotatesAt }]
POST /api/perks/redeem { riderId, perkId } -> { redemptionCode, tokensLeft }
GET /api/tokens?riderId=.. -> { balance, ledger: [{ delta, reason, createdAt, txSignature? }] }

POST /api/demo/sim { action: "start"|"stop"|"reset" } -> { running, riders }
```

## 5. Mock mode
`src/contracts/fixtures.ts` exports one realistic fixture per response above. With `NEXT_PUBLIC_USE_MOCKS=1`, C's data hooks return fixtures instead of fetching, so the UI never waits on a backend.

## 6. Scoring rules (B implements in `src/server/points/rules.ts`; tweak by issue only)
| Event | Points |
|---|---|
| Each stop credited on a verified ride | 1 |
| First verified ride of the day | +5 |
| Daily streak | +2 per day, capped at +10 |
| Hunt clue completed | +10 |
| Landmark claimed (once per rider) | bonus from data (default 15) |
| CitiTokens | 1 token per 10 points earned |

Points go to the district of the line ridden (`teamRouteId` of the vehicle). Lot tier thresholds (points per lot): 20 / 60 / 140 / 300 / 600. Cap: 60 ride-points per rider per hour (anti-abuse).

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

Any endpoint: 500 `internal` on unexpected errors.
