// API and data shapes. Source of truth: docs/CONTRACTS.md.
// Change only via a `type:contract` issue (AGENTS.md section 5).
// All times are ISO 8601 UTC strings.

export * from "./routes";

import type { TeamRouteId } from "./routes";

// ---------- Errors ----------
export interface ApiError {
  error: { code: string; message: string };
}

// ---------- Section 2: read endpoints (A) ----------
export interface HealthResponse {
  ok: true;
  time: string;
  /** Additive: database status. */
  db?: "ok" | "unconfigured" | "error";
}

/** GET /api/routes: one row per MBTA route id (Green-B, 741, ...). */
export interface RouteInfo {
  id: string;
  teamRouteId: TeamRouteId;
  name: string;
  color: string;
  districtName: string;
}
export type RoutesResponse = RouteInfo[];

/** GET /api/stops?routeId=Red */
export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
export type StopsResponse = Stop[];

export type VehicleStatus = "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";

export interface Vehicle {
  id: string;
  /** MBTA route id, e.g. "Green-B" or "742". */
  routeId: string;
  teamRouteId: TeamRouteId;
  directionId: 0 | 1;
  lat: number;
  lng: number;
  bearing: number | null;
  /** Meters per second, when MBTA reports it. */
  speed: number | null;
  currentStatus: VehicleStatus;
  stopId: string | null;
  stopSequence: number | null;
  label: string;
}

/** GET /api/vehicles?teams=Red,Green */
export interface VehiclesResponse {
  updatedAt: string;
  vehicles: Vehicle[];
}

export type DelaySource = "alert" | "simulated" | "none";

/** GET /api/delay?teamRouteId=Red, and POST /api/delay/simulate */
export interface DelayResponse {
  active: boolean;
  source: DelaySource;
  teamRouteIds: TeamRouteId[];
  message: string | null;
  startedAt: string | null;
}

/** GET /api/delay/heatmap?minutes=120 (T18). slowShare 0-1: trains crawling (< 1.5 m/s) toward the station. */
export interface HeatmapStation {
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  teamRouteId: TeamRouteId;
  observations: number;
  slowShare: number;
  avgSpeedMps: number | null;
}
export interface DelayHeatmapResponse {
  /** false when there is no history store (no DB); stations is then empty */
  available: boolean;
  updatedAt: string;
  windowMinutes: number;
  stations: HeatmapStation[];
}

export interface SimulateDelayRequest {
  teamRouteId: TeamRouteId;
  active: boolean;
}

// ---------- Section 3: riders and rides (A) ----------
export interface CreateRiderRequest {
  displayName: string;
  homeTeamRouteId: TeamRouteId;
}
export interface CreateRiderResponse {
  riderId: string;
}

/** GET /api/riders/:id */
export interface Rider {
  riderId: string;
  displayName: string;
  homeTeamRouteId: TeamRouteId;
  points: number;
  tokens: number;
  streakDays: number;
  /** Additive (#96): lowercase interest tags used to match hotspots. */
  interests?: string[];
  /** Additive (#96): small JPEG data URL, or null. */
  avatarDataUrl?: string | null;
}

/** PATCH /api/riders/:id (#96). Omitted fields are unchanged. Returns the full Rider. */
export interface UpdateRiderRequest {
  /** up to 12 tags, each 1-24 chars; normalized to lowercase and de-duplicated */
  interests?: string[];
  /** data:image/jpeg|png|webp;base64,... at most ~150 KB, or null to clear */
  avatarDataUrl?: string | null;
}

export type RideState = "searching" | "on_vehicle" | "in_tunnel" | "left";

export interface ManualRideHint {
  routeId: string;
  directionId: 0 | 1;
  stopId: string;
}

/** POST /api/rides/sample */
export interface RideSampleRequest {
  riderId: string;
  lat: number;
  lng: number;
  /** GPS accuracy radius in meters. */
  accuracy: number;
  /** Meters per second, null if the device doesn't report it. */
  speed: number | null;
  /** Client timestamp, ISO 8601. */
  ts: string;
  manual?: ManualRideHint;
}

export interface RideSampleResponse {
  state: RideState;
  sessionId: string;
  vehicleId?: string;
  teamRouteId?: TeamRouteId;
  stopsCredited: number;
  nextStopId?: string;
  message: string;
  /** Additive (#96): total points this ride has earned so far, bonuses included. */
  pointsAwarded?: number;
  /** Additive (#96): station the ride was started from (Start button). */
  originStationId?: string;
  /** Additive (#96): set while teammates (same team) are bound to the same train. */
  crew?: CrewBonus | null;
}

// ---------- Section 3b: ride start gate and crew bonus (A, #96) ----------
export interface NearStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
}

/** GET /api/rides/nearby?lat=..&lng=..&accuracy=.. : lets the UI enable the Start button. */
export interface NearbyStationResponse {
  canStart: boolean;
  /** effective radius used for this fix (grows a little with GPS inaccuracy) */
  radiusM: number;
  /** nearest station, even when too far to start */
  station: NearStation | null;
  message: string;
}

/** POST /api/rides/start. 403 not_near_station when too far; 409 ride_active returns nothing new. */
export interface StartRideRequest {
  riderId: string;
  lat: number;
  lng: number;
  /** meters; missing is treated as 1000 */
  accuracy: number;
}
export interface StartRideResponse {
  sessionId: string;
  state: RideState;
  station: NearStation;
  radiusM: number;
  message: string;
}

export interface CrewMate {
  riderId: string;
  displayName: string;
}
/** Teammates riding the same vehicle. The multiplier decays toward 1 the longer the crew rides. */
export interface CrewBonus {
  teammates: CrewMate[];
  /** current multiplier on ride_stop points, e.g. 3 -> 1 */
  multiplier: number;
  /** when the bonus reaches 1x */
  endsAt: string;
  /** bonus points this rider has earned from the crew on this ride */
  bonusPoints: number;
  message: string;
}

/** POST /api/rides/end */
export interface EndRideRequest {
  riderId: string;
}
export interface EndRideResponse {
  sessionId: string;
  stopsCredited: number;
  pointsAwarded: number;
}

// ---------- Section 4: game endpoints (B) ----------
export interface LeaderboardTeam {
  teamRouteId: TeamRouteId;
  points: number;
  rank: number;
  riders: number;
}
export interface LeaderboardResponse {
  updatedAt: string;
  teams: LeaderboardTeam[];
}

export type LotTier = 0 | 1 | 2 | 3 | 4 | 5;
export interface Lot {
  id: string;
  tier: LotTier;
  points: number;
  x: number;
  y: number;
  kind: string;
}
export interface District {
  teamRouteId: TeamRouteId;
  name: string;
  totalPoints: number;
  lots: Lot[];
}
export type DistrictsResponse = District[];

export interface HuntClue {
  id: string;
  text: string;
  verified: boolean;
}
export interface HuntResponse {
  huntId: string;
  stopId: string;
  clues: HuntClue[];
}
export interface CompleteHuntRequest {
  riderId: string;
  clueId: string;
}
export interface CompleteHuntResponse {
  pointsAwarded: number;
  tokensAwarded: number;
  alreadyDone: boolean;
}

/** POST /api/photo-check (T17, optional Gemini check). Does not award points. */
export interface PhotoCheckRequest {
  clueId: string;
  clueText: string;
  /** base64 image bytes without a data: prefix, at most 3 MB decoded */
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}
export interface PhotoCheckResponse {
  /** false: no key or Gemini unavailable, so the UI falls back to tap-to-confirm */
  enabled: boolean;
  passed: boolean | null;
  confidence: number | null;
  reason: string;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stopId: string;
  bonusPoints: number;
  claimed: boolean;
}
export type LandmarksResponse = Landmark[];
export interface ClaimLandmarkRequest {
  riderId: string;
  landmarkId: string;
  lat: number;
  lng: number;
}
export interface ClaimLandmarkResponse {
  pointsAwarded: number;
  alreadyClaimed: boolean;
}

export interface Perk {
  id: string;
  title: string;
  partner: string;
  costTokens: number;
  remaining: number;
  rotatesAt: string;
}
export type PerksResponse = Perk[];
export interface RedeemPerkRequest {
  riderId: string;
  perkId: string;
}
export interface RedeemPerkResponse {
  redemptionCode: string;
  tokensLeft: number;
}

export interface TokenLedgerEntry {
  delta: number;
  reason: string;
  createdAt: string;
  txSignature?: string;
}
export interface TokensResponse {
  balance: number;
  ledger: TokenLedgerEntry[];
}

export type DemoSimAction = "start" | "stop" | "reset";
export interface DemoSimRequest {
  action: DemoSimAction;
}
export interface DemoSimResponse {
  running: boolean;
  riders: number;
}

// ---------- Section 4c: hotspots (A, #96) ----------
/**
 * A hotspot is a station on an alternate MBTA route to one of the rider's usual destinations.
 * Riders on any team can hold the same hotspot; shared interests make that more likely.
 * Meeting another rider there (phone bump) pays `meetPoints` (= base x multiplier).
 */
export interface Hotspot {
  id: string;
  stationId: string;
  name: string;
  lat: number;
  lng: number;
  /** the usual trip this is an alternative to (parent station ids) */
  fromStationId: string;
  toStationId: string;
  /** alternate path, station ids from origin to destination, passing through the hotspot */
  path: string[];
  /** MBTA route ids used along the alternate path, in order */
  viaRouteIds: string[];
  /** user-ready one-liner, e.g. "Take the Orange Line via Back Bay instead of the Green Line" */
  reason: string;
  /** interests the rider shares with others holding this hotspot */
  sharedInterests: string[];
  /** other riders (any team) currently holding a hotspot at this station */
  sharedWith: number;
  multiplier: number;
  meetPoints: number;
  createdAt: string;
  expiresAt: string;
}
/** GET /api/hotspots?riderId=..  and  POST /api/hotspots/generate { riderId } */
export interface HotspotsResponse {
  riderId: string;
  /** completed rides with a known origin and destination */
  tripsLogged: number;
  tripsNeeded: number;
  eligible: boolean;
  hotspots: Hotspot[];
}

/** POST /api/hotspots/meet. Both phones call it within a few seconds ("bump"), or one enters the other's code. */
export interface MeetRequest {
  riderId: string;
  hotspotId: string;
  lat: number;
  lng: number;
  /** partner's 4-digit code, when pairing by code instead of a simultaneous bump */
  code?: string;
}
export interface MeetResponse {
  status: "waiting" | "matched" | "expired";
  /** this rider's code to show the partner; valid until expiresAt */
  code: string;
  expiresAt: string;
  partner?: { riderId: string; displayName: string; homeTeamRouteId: TeamRouteId };
  multiplier: number;
  pointsAwarded: number;
  message: string;
}

// ---------- Section 4d: delay photo challenges (A, #96) ----------
/** Solo scavenger hunt, open only while a delay is active. Gemini grades the photo. */
export interface PhotoChallenge {
  id: string;
  /** what to photograph, generic (never a claim about a specific station) */
  prompt: string;
  /** max points; actual award scales with the grade */
  points: number;
  done: boolean;
  pointsAwarded: number;
}
/** GET /api/challenges?riderId=.. */
export interface ChallengesResponse {
  active: boolean;
  delay: DelayResponse;
  /** stable id for this delay window; null when no delay */
  roundId: string | null;
  challenges: PhotoChallenge[];
}
/** POST /api/challenges/submit */
export interface ChallengeSubmitRequest {
  riderId: string;
  challengeId: string;
  /** base64 bytes (data: prefix tolerated), at most 3 MB decoded */
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}
export interface ChallengeSubmitResponse {
  /** false: grading unavailable (no Gemini key and no demo); nothing awarded */
  enabled: boolean;
  passed: boolean | null;
  /** 0-1 grade */
  score: number | null;
  reason: string;
  pointsAwarded: number;
  alreadyDone: boolean;
  /** true when graded by the offline demo grader instead of Gemini */
  demo?: boolean;
}

// ---------- Section 6: internal scoring call (B exports, A calls) ----------
export type PointEventType =
  | "ride_stop"
  | "first_ride"
  | "streak"
  | "hunt"
  | "landmark"
  /** #96: crew bonus on top of ride_stop (not subject to the hourly ride cap) */
  | "co_ride"
  /** #96: phone bump at a hotspot */
  | "hotspot_meet"
  /** #96: graded delay photo challenge */
  | "challenge";

export interface AwardPointsInput {
  riderId: string;
  teamRouteId: TeamRouteId;
  type: PointEventType;
  amount: number;
  /** Idempotency key: awarding the same ref twice is a no-op. */
  ref: string;
}
export interface AwardPointsResult {
  pointsAwarded: number;
  tokensAwarded: number;
}
export type AwardPoints = (input: AwardPointsInput) => Promise<AwardPointsResult>;
